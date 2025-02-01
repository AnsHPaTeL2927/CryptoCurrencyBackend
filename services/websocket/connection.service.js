import RedisService from '../redis/redis.service.js';
import logger from '../../utils/logger.js';

export class ConnectionService {
  async handleConnection(socket) {
    try {
      console.log(socket)
      // Store socket connection in Redis
      await RedisService.hset(
        'socket:connections',
        socket.user.id.toString(),
        {
          socketId: socket.id,
          userId: socket.user.id,
          connectedAt: new Date().toISOString()
        }
      );

      // Join user to their personal room
      socket.join(`user:${socket.user.id}`);
      
      logger.info(`User connected: ${socket.user.id}`);
    } catch (error) {
      logger.error('Connection handler error:', error);
    }
  }

  async handleDisconnect(socket) {
    try {
      // Remove socket connection from Redis
      await RedisService.delete(`socket:connections:${socket.user.id}`);
      logger.info(`User disconnected: ${socket.user.id}`);
    } catch (error) {
      logger.error('Disconnect handler error:', error);
    }
  }
}