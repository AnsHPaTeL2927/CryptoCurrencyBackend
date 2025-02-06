import SocketServer from '../../config/websocket/socket.js';
import logger from '../../utils/logger.js';
import WebSocketHelpers from '../../utils/helpers/websocket.helper.js';
import RedisService from '../redis/redis.service.js';

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

    async handleChainConnection(userId, chain) {
        try {
            const connectionKey = `${chain}:connections:${userId}`;
            await RedisService.set(connectionKey, {
                connected: true,
                timestamp: Date.now()
            });
            logger.info(`Chain connection established for user ${userId} on ${chain}`);
        } catch (error) {
            logger.error('Chain connection error:', error);
            throw error;
        }
    }

    async handleChainDisconnection(userId, chain) {
        try {
            const connectionKey = `${chain}:connections:${userId}`;
            await RedisService.delete(connectionKey);
            logger.info(`Chain connection closed for user ${userId} on ${chain}`);
        } catch (error) {
            logger.error('Chain disconnection error:', error);
            throw error;
        }
    }

    // Room Status Methods
    async getRoomStatus(room) {
        try {
            const io = SocketServer.getIO();
            const clients = await io.in(room).allSockets();
            return {
                room,
                clientCount: clients.size,
                clients: Array.from(clients)
            };
        } catch (error) {
            logger.error('Get room status error:', error);
            throw error;
        }
    }

    async getUserRooms(userId) {
        try {
            const socketId = await WebSocketHelpers.getUserSocket(userId);
            if (socketId) {
                const io = SocketServer.getIO();
                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    return Array.from(socket.rooms);
                }
            }
            return [];
        } catch (error) {
            logger.error('Get user rooms error:', error);
            throw error;
        }
    }
}