import { Server } from 'socket.io';
import { environment } from '../environment.js';
import { socketAuthMiddleware } from '../../middleware/socket/auth.middleware.js';
import { socketErrorMiddleware } from '../../middleware/socket/error.middleware.js';
import { ConnectionService } from '../../services/websocket/connection.service.js';
import { SOCKET_EVENTS } from './events.js';
import logger from '../../utils/logger.js';
import WebSocketController from '../../controllers/websocket/websocket.controller.js';
import websocketService from '../../services/websocket/websocket.service.js';

class SocketServer {
    constructor() {
        this.io = null;
        this.connectionService = new ConnectionService();
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
                credentials: true
            },
            maxHttpBufferSize: 1e8,
            pingTimeout: environment.socket.pingTimeout,
            pingInterval: environment.socket.pingInterval,
            transports: ['websocket', 'polling'],
            allowEIO3: true,
            path: '/socket.io/',
            allowRequest: (req, callback) => {
                callback(null, true); // Allow all requests initially
            }
        });

        this.setupMiddleware();
        this.setupEventHandlers();

        logger.info('WebSocket server initialized successfully');
        return this.io;
    }

    setupMiddleware() {
        if (!this.io) {
            throw new Error('Cannot setup middleware: Socket.IO not initialized');
        }
        this.io.use(socketAuthMiddleware);
        // this.io.use(socketErrorMiddleware);
    }

    setupEventHandlers() {
        this.io.on(SOCKET_EVENTS.CONNECT, async (socket) => {
            try {
                // Handle connection using ConnectionService
                await this.connectionService.handleConnection(socket);
                logger.info(`Client connected: ${socket.id}`);

                // Crypto subscription handler
                socket.on(SOCKET_EVENTS.SUBSCRIBE_CRYPTO, (data) => {
                    logger.info(`Crypto subscription request from ${socket.id}:`, data);
                    const { symbols, type } = data;

                    WebSocketController.subscribeCryptoStream(socket, data);
                    symbols.forEach(symbol => {
                        socket.join(`crypto:${symbol}`);
                        logger.info(`Socket ${socket.id} subscribed to ${symbol}`);
                    });
                });

                socket.on(SOCKET_EVENTS.JOIN_ROOM, (room) => {
                    socket.join(room);
                    logger.info(`Socket ${socket.id} joined room ${room}`);
                });

                socket.on(SOCKET_EVENTS.LEAVE_ROOM, (room) => {
                    socket.leave(room);
                    logger.info(`Socket ${socket.id} left room ${room}`);
                });

                // Add error handling
                socket.on(SOCKET_EVENTS.ERROR, (error) => {
                    logger.error(`Socket ${socket.id} error:`, error);
                });

                socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
                    websocketService.cleanup(socket.id);
                    await this.connectionService.handleDisconnect(socket);
                    logger.info(`Client disconnected: ${socket.id}`);
                });

            } catch (error) {
                logger.error('Error in socket connection:', error);
                socket.disconnect(true);
            }
        });
    }

    getIO() {
        if (!this.io) {
            throw new Error('Socket.IO not initialized - call initialize() first');
        }
        return this.io;
    }
}

export default new SocketServer();