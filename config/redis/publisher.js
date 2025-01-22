import RedisClient from './client';
import logger from '../../utils/logger.js';

class RedisPublisher {
  constructor() {
    this.publisher = RedisClient.connect().duplicate();
  }

  async publish(channel, message) {
    try {
      await this.publisher.publish(channel, JSON.stringify(message));
      logger.info(`Message published to channel ${channel}`);
    } catch (error) {
      logger.error('Redis publish error:', error);
      throw error;
    }
  }
}

export default new RedisPublisher();