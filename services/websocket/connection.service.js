import redisService from '../redis/redis.service.js';
import logger from '../../utils/logger.js';

export class ConnectionService {
  async handleConnection(socket) {
    try {
      // Store socket connection in Redis
      await redisService.hset(
        'socket:connections',
        socket.user._id.toString(),
        {
          socketId: socket.id,
          userId: socket.user._id,
          connectedAt: new Date().toISOString()
        }
      );

      // Join user to their personal room
      socket.join(`user:${socket.user._id}`);
      
      logger.info(`User connected: ${socket.user._id}`);
    } catch (error) {
      logger.error('Connection handler error:', error);
    }
  }

  async handleDisconnect(socket) {
    try {
      // Remove socket connection from Redis
      await redisService.delete(`socket:connections:${socket.user._id}`);
      logger.info(`User disconnected: ${socket.user._id}`);
    } catch (error) {
      logger.error('Disconnect handler error:', error);
    }
  }
}