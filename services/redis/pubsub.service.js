import RedisPublisher from '../../config/redis/publisher.js';
import RedisSubscriber from '../../config/redis/subscriber.js';
import { RedisError } from '../../utils/errors/redis.error.js';
import logger from '../../utils/logger.js';

export class PubSubService {
    static async publish(channel, message) {
        try {
            await RedisPublisher.publish(channel, message);
        } catch (error) {
            logger.error('Redis publish error:', error);
            throw new RedisError('Failed to publish message', 'PUBLISH_ERROR');
        }
    }

    static async subscribe(channel, handler) {
        try {
            await RedisSubscriber.subscribe(channel, handler);
        } catch (error) {
            logger.error('Redis subscribe error:', error);
            throw new RedisError('Failed to subscribe to channel', 'SUBSCRIBE_ERROR');
        }
    }

    static async unsubscribe(channel) {
        try {
            await RedisSubscriber.unsubscribe(channel);
        } catch (error) {
            logger.error('Redis unsubscribe error:', error);
            throw new RedisError('Failed to unsubscribe from channel', 'UNSUBSCRIBE_ERROR');
        }
    }
}