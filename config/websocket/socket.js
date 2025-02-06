import { Server } from 'socket.io';
import { environment } from '../environment.js';
import WebSocketService from '../../services/websocket/websocket.service.js';
import WebSocketValidation from '../../validations/websocket.validation.js';
import WebSocketError from '../../utils/errors/websocket.error.js';
import { socketAuthMiddleware } from '../../middleware/socket/auth.middleware.js';
import logger from '../../utils/logger.js';
import { RoomService } from '../../services/websocket/room.service.js';

class SocketServer {
    constructor() {
        this.io = null;
    }

    initialize(server) {
        if (this.io) {
            logger.warn('Socket server already initialized');
            return this.io;
        }

        this.io = new Server(server, {
            cors: {
                origin: environment.socket.corsOrigin,
                methods: ["GET", "POST"],
                credentials: true,
                allowedHeaders: ["Authorization"]  // Add this
            },
            maxHttpBufferSize: 1e8,
            pingTimeout: 60000,
            pingInterval: 25000,
            transports: ['websocket', 'polling'],
            allowEIO3: true,
            path: '/socket.io/',  // Add trailing slash
            connectTimeout: 45000,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });
        // Add authentication middleware
        this.io.use(socketAuthMiddleware);

        this.setupEventHandlers();
        logger.info('WebSocket server initialized');
        return this.io;
    }

    setupEventHandlers() {
        this.io.on('connect', async (socket) => {
            try {
                console.log('New connection attempt:', socket.id); // Add this
                // Handle connection
                await WebSocketService.handleConnection(socket);
                console.log('Connection handled successfully'); // Add this

                // Setup event listeners
                this.setupSubscriptionHandlers(socket);
                this.setupStreamHandlers(socket);
                this.setupRoomHandlers(socket);
                this.setupDisconnectHandler(socket);

                this.io.on('error', (error) => {
                    console.error('Socket.IO error:', error);
                });
                this.io.on('connect_failed', (error) => {
                    console.error('Connection failed:', error);
                });
            
                this.io.on('connect_timeout', (error) => {
                    console.error('Connection timeout:', error);
                });

                // Emit connection success
                socket.emit('connection_success', {
                    userId: socket.user.id,
                    timestamp: new Date().toISOString()
                });
                console.log('Connection setup complete'); // Add this
            } catch (error) {
                console.error('Connection error:', error); // Add this
                WebSocketError.handleConnectionError(socket, error);
            }
        });
    }

    setupSubscriptionHandlers(socket) {
        // Crypto subscription
        socket.on('subscribe_crypto', async (data) => {
            try {
                // WebSocketValidation.validateSubscriptionData(data);
                const subscriptionId = await WebSocketService.subscribeToCrypto(
                    socket, 
                    socket.user.id, 
                    data.symbols, 
                    data.options
                );
                socket.emit('subscription_success', { 
                    type: 'crypto', 
                    subscriptionId,
                    symbols: data.symbols 
                });
            } catch (error) {
                WebSocketError.handleSubscriptionError(socket, error, data);
            }
        });

        // Market subscription
        socket.on('subscribe_market', async (data) => {
            try {
                WebSocketValidation.validateSubscriptionData(data);
                const subscriptionId = await WebSocketService.subscribeToMarket(
                    socket.user.id, 
                    data.symbols
                );
                socket.emit('subscription_success', { 
                    type: 'market', 
                    subscriptionId,
                    symbols: data.symbols 
                });
            } catch (error) {
                WebSocketError.handleSubscriptionError(socket, error, data);
            }
        });

        // Portfolio subscription
        socket.on('subscribe_portfolio', async () => {
            try {
                const subscriptionId = await WebSocketService.subscribeToPortfolio(socket.user.id);
                socket.emit('subscription_success', { 
                    type: 'portfolio', 
                    subscriptionId 
                });
            } catch (error) {
                WebSocketError.handleSubscriptionError(socket, error, { type: 'portfolio' });
            }
        });

        // Unsubscribe
        socket.on('unsubscribe', async (streamId) => {
            try {
                await WebSocketService.unsubscribe(socket.user.id, streamId);
                socket.emit('unsubscribe_success', { streamId });
            } catch (error) {
                WebSocketError.handleSubscriptionError(socket, error, { streamId });
            }
        });
    }

    setupStreamHandlers(socket) {
        socket.on('start_stream', async (data) => {
            try {
                WebSocketValidation.validateStreamParameters(data.type, data.params);
                const streamId = await WebSocketService.startStream(data.type, {
                    ...data.params,
                    userId: socket.user.id
                });
                socket.emit('stream_started', { 
                    type: data.type, 
                    streamId 
                });
            } catch (error) {
                WebSocketError.handleStreamError(socket, error, data);
            }
        });

        socket.on('stop_stream', async (streamId) => {
            try {
                await WebSocketService.stopStream(streamId);
                socket.emit('stream_stopped', { streamId });
            } catch (error) {
                WebSocketError.handleStreamError(socket, error, streamId);
            }
        });
    }

    setupRoomHandlers(socket) {
        socket.on('join_room', async (room) => {
            try {
                WebSocketValidation.validateRoomName(room);
                await RoomService.joinRoom(socket, room);
                socket.emit('room_joined', { room });
            } catch (error) {
                WebSocketError.handleRoomError(socket, error, room);
            }
        });

        socket.on('leave_room', async (room) => {
            try {
                WebSocketValidation.validateRoomName(room);
                await RoomService.leaveRoom(socket.id, room);
                socket.emit('room_left', { room });
            } catch (error) {
                WebSocketError.handleRoomError(socket, error, room);
            }
        });
    }

    setupDisconnectHandler(socket) {
        socket.on('disconnect', async () => {
            try {
                await WebSocketService.handleDisconnect(socket);
            } catch (error) {
                logger.error('Disconnect error:', error);
            }
        });
    }

    getIO() {
        if (!this.io) {
            throw new Error('Socket.IO not initialized');
        }
        return this.io;
    }
}

export default new SocketServer();