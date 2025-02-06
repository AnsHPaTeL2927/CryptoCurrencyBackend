import logger from '../../utils/logger.js';
import RedisService from '../../services/redis/redis.service.js'
import WebSocketHelpers from '../../utils/helpers/websocket.helper.js'
import SubscriptionService from './subscription.service.js';

export class ConnectionService {
  static async handleConnection(socket) {
    try {
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

      // await RedisService.setSocketSession(socket.user.id, socket.id);

      logger.info(`User connected: ${socket.user.id}`);
    } catch (error) {
      logger.error('Connection handler error:', error);
    }
  }

  static async handleDisconnect(socket) {
    try {
      await SubscriptionService.cleanup(socket.id);
      await RedisService.hdel('socket:connections', socket.user.id.toString());
      // Remove socket connection from Redis
      await RedisService.delete(`socket:connections:${socket.user.id}`);
      logger.info(`User disconnected: ${socket.user.id}`);
    } catch (error) {
      logger.error('Disconnect handler error:', error);
      throw error;
    }
  }

  static async disconnectUser(userId) {
    try {
      const socketId = await WebSocketHelpers.getUserSocket(userId);
      if (socketId) {
        // Clean up subscriptions
        await SubscriptionService.cleanup(socketId);

        // Remove connection data
        await RedisService.delete(`user:${userId}:socket`);
        await RedisService.delete(`socket:session:${userId}`);

        logger.info(`User ${userId} forcefully disconnected`);
      }
    } catch (error) {
      logger.error('User disconnect error:', error);
      throw error;
    }
  }

  static async isUserConnected(userId) {
    try {
      const socketId = await WebSocketHelpers.getUserSocket(userId);
      return !!socketId;
    } catch (error) {
      logger.error('Check user connection error:', error);
      return false;
    }
  }

  static async getUserConnections() {
    try {
      const connections = await RedisService.hgetall('socket:connections');
      return Object.entries(connections).map(([userId, data]) => ({
        userId,
        ...JSON.parse(data)
      }));
    } catch (error) {
      logger.error('Get user connections error:', error);
      throw error;
    }
  }

  static async refreshConnection(userId) {
    try {
      const socketId = await WebSocketHelpers.getUserSocket(userId);
      if (socketId) {
        await RedisService.setSocketSession(userId, socketId);
        logger.info(`Connection refreshed for user ${userId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Connection refresh error:', error);
      throw error;
    }
  }
}