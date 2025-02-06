// utils/helpers/websocket.helper.js
import RedisService from '../../services/redis/redis.service.js';
import logger from '../../utils/logger.js';

class WebSocketHelpers {
    static async getUserSocket(userId) {
        try {
            const socketId = await RedisService.hget('socket:connections', userId);
            if (!socketId) {
                logger.warn(`No socket found for user ${userId}`);
                return null;
            }
            return socketId;
        } catch (error) {
            logger.error('Error getting user socket:', error);
            return null;
        }
    }

    static async clearIntervals(socketId) {
        try {
            const intervals = await RedisService.get(`intervals:${socketId}`);
            if (intervals && Array.isArray(intervals)) {
                intervals.forEach(interval => clearInterval(interval));
                await RedisService.delete(`intervals:${socketId}`);
                logger.info(`Cleared intervals for socket ${socketId}`);
            }
        } catch (error) {
            logger.error('Error clearing intervals:', error);
        }
    }
}

export default WebSocketHelpers;