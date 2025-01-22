import SocketServer from '../../config/websocket/socket.js';
import logger from '../../utils/logger.js';

export class RoomService {
    static async joinRoom(socket, room) {
        try {
            await socket.join(room);
            logger.info(`Socket ${socket.id} joined room ${room}`);
        } catch (error) {
            logger.error('Room join error:', error);
            throw error;
        }
    }

    static async leaveRoom(socket, room) {
        try {
            await socket.leave(room);
            logger.info(`Socket ${socket.id} left room ${room}`);
        } catch (error) {
            logger.error('Room leave error:', error);
            throw error;
        }
    }

    static async getRoomMembers(room) {
        try {
            const io = SocketServer.getIO();
            const sockets = await io.in(room).allSockets();
            return Array.from(sockets);
        } catch (error) {
            logger.error('Get room members error:', error);
            throw error;
        }
    }
}