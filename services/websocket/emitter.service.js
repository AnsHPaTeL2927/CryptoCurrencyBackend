import SocketServer from '../../config/websocket/socket.js';
import { CacheService } from '../redis/cache.service.js';
import logger from '../../utils/logger.js';

export class EmitterService {
    static async emitToUser(userId, event, data) {
        try {
            const io = SocketServer.getIO();
            const userSocket = await CacheService.getHash('socket:connections', userId);

            if (userSocket) {
                io.to(userSocket.socketId).emit(event, data);
                logger.info(`Event ${event} emitted to user ${userId}`);
            }
        } catch (error) {
            logger.error('Socket emit error:', error);
            throw error;
        }
    }

    static async emitToRoom(room, event, data) {
        try {
            const io = SocketServer.getIO();
            io.to(room).emit(event, data);
            logger.info(`Event ${event} emitted to room ${room}`);
        } catch (error) {
            logger.error('Socket room emit error:', error);
            throw error;
        }
    }

    static async broadcast(event, data, except = null) {
        try {
            const io = SocketServer.getIO();
            if (except) {
                except.broadcast.emit(event, data);
            } else {
                io.emit(event, data);
            }
            logger.info(`Event ${event} broadcasted`);
        } catch (error) {
            logger.error('Socket broadcast error:', error);
            throw error;
        }
    }
}
