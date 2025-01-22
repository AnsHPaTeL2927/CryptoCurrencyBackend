import { Server } from 'socket.io';
import { environment } from '../environment.js';
import { socketAuthMiddleware } from '../../middleware/socket/auth.middleware.js';
import { socketErrorMiddleware } from '../../middleware/socket/error.middleware.js';
import { ConnectionService } from '../../services/websocket/connection.service.js';
import logger from '../../utils/logger.js';
import { SOCKET_EVENTS } from './events.js';

class SocketServer {
    constructor() {
        this.io = null;
        this.connectionService = new ConnectionService();
    }

    initialize(httpServer) {
        this.io = new Server(httpServer, {
            path: environment.socket.path,
            cors: {
                origin: environment.socket.corsOrigin,
                methods: ['GET', 'POST'],
                credentials: true
            },
            maxHttpBufferSize: environment.socket.maxBufferSize,
            pingTimeout: environment.socket.pingTimeout,
            pingInterval: environment.socket.pingInterval,
            transports: ['websocket', 'polling'],
            allowEIO3: true
        });

        this.setupMiddleware();
        this.setupEventHandlers();

        logger.info('WebSocket server initialized');
        return this.io;
    }

    setupMiddleware() {
        this.io.use(socketAuthMiddleware);
        this.io.use(socketErrorMiddleware);
    }

    setupEventHandlers() {
        this.io.on(SOCKET_EVENTS.CONNECT, (socket) => {
            this.connectionService.handleConnection(socket);

            socket.on(SOCKET_EVENTS.DISCONNECT, () => {
                this.connectionService.handleDisconnect(socket);
            });

            socket.on(SOCKET_EVENTS.ERROR, (error) => {
                logger.error('Socket error:', error);
            });
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