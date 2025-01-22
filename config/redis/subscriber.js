import RedisClient from './client';
import logger from '../../utils/logger.js';

class RedisSubscriber {
    constructor() {
        this.subscriber = RedisClient.connect().duplicate();
        this.handlers = new Map();
    }

    async subscribe(channel, handler) {
        try {
            await this.subscriber.subscribe(channel);
            this.handlers.set(channel, handler);

            this.subscriber.on('message', (ch, message) => {
                if (ch === channel) {
                    const handler = this.handlers.get(channel);
                    if (handler) {
                        handler(JSON.parse(message));
                    }
                }
            });

            logger.info(`Subscribed to channel ${channel}`);
        } catch (error) {
            logger.error('Redis subscribe error:', error);
            throw error;
        }
    }

    async unsubscribe(channel) {
        try {
            await this.subscriber.unsubscribe(channel);
            this.handlers.delete(channel);
            logger.info(`Unsubscribed from channel ${channel}`);
        } catch (error) {
            logger.error('Redis unsubscribe error:', error);
            throw error;
        }
    }
}

export default new RedisSubscriber();