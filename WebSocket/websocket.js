// websocket/websocket.js
import { WebSocketServer } from 'ws';
import { redisClient } from '../config/redis.js';
import { marketService } from '../services/market.service.js';
import { portfolioService } from '../services/portfolio.service.js';

class WSServer {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // Store client connections with metadata
        this.messageQueue = new Map(); // Queue for missed messages
        this.heartbeatInterval = 30000; // 30 seconds
        this.reconnectDelay = 5000; // 5 seconds
    }

    // Initialize WebSocket Server
    init(server) {
        try {
            this.wss = new WebSocketServer({ 
                server,
                clientTracking: true,
                perMessageDeflate: {
                    zlibDeflateOptions: {
                        chunkSize: 1024,
                        memLevel: 7,
                        level: 3
                    },
                    zlibInflateOptions: {
                        chunkSize: 10 * 1024
                    },
                    concurrencyLimit: 10,
                    threshold: 1024
                }
            });
            
            this.setupServerHandlers();
            this.startHeartbeat();
            console.log('WebSocket Server initialized successfully');
        } catch (error) {
            console.error('WebSocket Server initialization failed:', error);
            throw error;
        }
    }

    // Setup Server Event Handlers
    setupServerHandlers() {
        this.wss.on('connection', (ws, req) => {
            try {
                const clientId = this.generateClientId();
                
                // Store client metadata
                this.clients.set(ws, {
                    id: clientId,
                    ip: req.socket.remoteAddress,
                    subscriptions: new Set(),
                    isAlive: true,
                    connectedAt: Date.now()
                });

                // Setup client handlers
                this.setupClientHandlers(ws, clientId);
                
                // Send initial connection success
                this.sendToClient(ws, {
                    type: 'connection',
                    status: 'connected',
                    clientId
                });

                // Send any queued messages
                this.sendQueuedMessages(clientId);

                console.log(`Client ${clientId} connected`);
            } catch (error) {
                console.error('Error handling new connection:', error);
                ws.terminate();
            }
        });

        this.wss.on('error', this.handleServerError.bind(this));
    }

    // Setup Individual Client Handlers
    setupClientHandlers(ws, clientId) {
        // Ping-Pong Heartbeat
        ws.on('pong', () => {
            const client = this.clients.get(ws);
            if (client) {
                client.isAlive = true;
            }
        });

        // Handle Messages
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data);
                await this.handleClientMessage(ws, message);
            } catch (error) {
                this.handleMessageError(ws, error);
            }
        });

        // Handle Client Disconnect
        ws.on('close', () => {
            this.handleClientDisconnect(ws, clientId);
        });

        // Handle Errors
        ws.on('error', (error) => {
            this.handleClientError(ws, error);
        });
    }

    // Message Handler
    async handleClientMessage(ws, message) {
        const client = this.clients.get(ws);
        if (!client) return;

        try {
            switch (message.type) {
                case 'subscribe':
                    await this.handleSubscription(ws, client, message);
                    break;

                case 'unsubscribe':
                    await this.handleUnsubscription(ws, client, message);
                    break;

                case 'portfolio_update':
                    await this.handlePortfolioUpdate(ws, client, message);
                    break;

                default:
                    this.sendToClient(ws, {
                        type: 'error',
                        message: 'Unknown message type'
                    });
            }
        } catch (error) {
            console.error('Error handling client message:', error);
            this.handleMessageError(ws, error);
        }
    }

    // Subscription Handler
    async handleSubscription(ws, client, message) {
        try {
            const { channels } = message;
            
            if (!Array.isArray(channels)) {
                throw new Error('Channels must be an array');
            }

            channels.forEach(channel => {
                client.subscriptions.add(channel);
            });

            // Initialize data streams for subscribed channels
            for (const channel of channels) {
                switch (channel) {
                    case 'price_updates':
                        await this.initializePriceStream(ws);
                        break;
                    case 'portfolio_updates':
                        await this.initializePortfolioStream(ws, client.id);
                        break;
                }
            }

            this.sendToClient(ws, {
                type: 'subscription_success',
                channels
            });
        } catch (error) {
            console.error('Subscription error:', error);
            this.handleSubscriptionError(ws, error);
        }
    }

    // Handle Unsubscription
    async handleUnsubscription(ws, client, message) {
        try {
            const { channels } = message;
            
            if (!Array.isArray(channels)) {
                throw new Error('Channels must be an array');
            }

            channels.forEach(channel => {
                client.subscriptions.delete(channel);
            });

            this.sendToClient(ws, {
                type: 'unsubscription_success',
                channels
            });
        } catch (error) {
            console.error('Unsubscription error:', error);
            this.handleSubscriptionError(ws, error);
        }
    }

    // Price Stream Initialization
    async initializePriceStream(ws) {
        try {
            const prices = await marketService.getCurrentPrices(['bitcoin', 'ethereum']);
            this.sendToClient(ws, {
                type: 'price_update',
                data: prices
            });
        } catch (error) {
            this.handleStreamError(ws, 'price_stream', error);
        }
    }

    // Portfolio Stream Initialization
    async initializePortfolioStream(ws, clientId) {
        try {
            const portfolio = await portfolioService.getPortfolioSummary(clientId);
            this.sendToClient(ws, {
                type: 'portfolio_update',
                data: portfolio
            });
        } catch (error) {
            this.handleStreamError(ws, 'portfolio_stream', error);
        }
    }

    // Broadcast Updates
    broadcast(data, channel) {
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocketServer.OPEN && 
                this.clients.get(client)?.subscriptions.has(channel)) {
                this.sendToClient(client, data);
            }
        });
    }

    // Heartbeat Mechanism
    startHeartbeat() {
        setInterval(() => {
            this.wss.clients.forEach(ws => {
                const client = this.clients.get(ws);
                if (!client || !client.isAlive) {
                    this.handleClientTimeout(ws);
                    return;
                }
                
                client.isAlive = false;
                ws.ping();
            });
        }, this.heartbeatInterval);
    }

    // Message Queuing
    queueMessage(clientId, message) {
        if (!this.messageQueue.has(clientId)) {
            this.messageQueue.set(clientId, []);
        }
        this.messageQueue.get(clientId).push({
            message,
            timestamp: Date.now()
        });

        this.cleanupMessageQueue(clientId);
    }

    // Send Queued Messages
    async sendQueuedMessages(clientId) {
        const messages = this.messageQueue.get(clientId) || [];
        for (const { message } of messages) {
            await this.handleClientMessage(ws, message);
        }
        this.messageQueue.delete(clientId);
    }

    // Queue Cleanup
    cleanupMessageQueue(clientId) {
        const queue = this.messageQueue.get(clientId);
        if (queue) {
            const oneHourAgo = Date.now() - 3600000;
            this.messageQueue.set(
                clientId,
                queue.filter(item => item.timestamp > oneHourAgo)
            );
        }
    }

    // Error Handlers
    handleServerError(error) {
        console.error('WebSocket Server Error:', error);
    }

    handleClientError(ws, error) {
        console.error('Client Error:', error);
        this.sendToClient(ws, {
            type: 'error',
            message: 'Internal error occurred'
        });
    }

    handleMessageError(ws, error) {
        console.error('Message Processing Error:', error);
        this.sendToClient(ws, {
            type: 'error',
            message: 'Failed to process message'
        });
    }

    handleStreamError(ws, streamType, error) {
        console.error(`Stream Error (${streamType}):`, error);
        this.sendToClient(ws, {
            type: 'stream_error',
            stream: streamType,
            message: 'Stream initialization failed'
        });
    }

    handleClientTimeout(ws) {
        try {
            const client = this.clients.get(ws);
            if (client) {
                console.log(`Client ${client.id} timed out`);
                ws.terminate();
                this.clients.delete(ws);
            }
        } catch (error) {
            console.error('Error handling client timeout:', error);
        }
    }

    handleClientDisconnect(ws, clientId) {
        try {
            console.log(`Client ${clientId} disconnected`);
            this.clients.delete(ws);
            ws.terminate();
        } catch (error) {
            console.error('Error handling client disconnect:', error);
        }
    }

    // Utility Methods
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    sendToClient(ws, data) {
        if (ws.readyState === WebSocketServer.OPEN) {
            try {
                ws.send(JSON.stringify(data));
            } catch (error) {
                console.error('Error sending message to client:', error);
            }
        }
    }

    shutdown() {
        try {
            if (this.wss) {
                this.wss.clients.forEach(client => {
                    client.terminate();
                });
                this.wss.close(() => {
                    console.log('WebSocket Server shut down');
                });
            }
        } catch (error) {
            console.error('Error during WebSocket shutdown:', error);
        }
    }
}

// Create WebSocket instance
const wsServer = new WSServer();

// Export setup function
export const setupWebSocket = (server) => {
    try {
        wsServer.init(server);
        return wsServer;
    } catch (error) {
        console.error('Failed to setup WebSocket server:', error);
        throw error;
    }
};

// Export instance for direct access
export const getWebSocketServer = () => wsServer;

// Handle process termination
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down WebSocket server...');
    wsServer.shutdown();
});

export default wsServer;