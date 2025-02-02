import RedisService from '../../services/redis/redis.service.js';
import logger from '../../utils/logger.js';

export class WebSocketHelpers {
    static async getUserSocket(userId) {
        const socketId = await RedisService.hget(`socket:connections`, userId);
        if (!socketId) {
            logger.warn(`No socket found for user ${userId}`);
            return null;
        }
        return socketId;
    }

    static async saveInterval(socketId, interval) {
        const intervals = await RedisService.get(`intervals:${socketId}`) || [];
        intervals.push(interval);
        await RedisService.set(`intervals:${socketId}`, intervals);
    }

    static async clearIntervals(socketId) {
        const intervals = await RedisService.get(`intervals:${socketId}`);
        if (intervals) {
            intervals.forEach(interval => clearInterval(interval));
            await RedisService.delete(`intervals:${socketId}`);
        }
    }

    static async startDataStream(socketId, eventName, fetcher, interval = 5000) {
        const intervalId = setInterval(async () => {
            try {
                const updates = await fetcher();
                this.io.to(socketId).emit(eventName, updates);
            } catch (error) {
                logger.error(`${eventName} stream error:`, error);
            }
        }, interval);

        await this.saveInterval(socketId, intervalId);
    }

    static getExchangePairs(exchanges) {
        const pairs = [];
        const exchangeList = exchanges.length > 0 ? exchanges : ['binance', 'coinbase', 'kraken', 'huobi'];

        for (let i = 0; i < exchangeList.length; i++) {
            for (let j = i + 1; j < exchangeList.length; j++) {
                pairs.push([exchangeList[i], exchangeList[j]]);
            }
        }

        return pairs;
    }

    static async initializeSocket(userId, socketId) {
        await RedisService.set(`user:${userId}:socket`, socketId);
        logger.info(`Socket initialized for user ${userId}`);
    }

    static async removeSocket(userId) {
        await RedisService.delete(`user:${userId}:socket`);
        await this.clearIntervals(userId);
        logger.info(`Socket removed for user ${userId}`);
    }

    static async updateSubscriptionMetadata(subscriptionId, metadata) {
        await RedisService.set(`subscription:${subscriptionId}:metadata`, metadata);
    }

    static async validateSubscription(subscription) {
        const validTypes = ['crypto', 'trades', 'prices', 'orderbook', 'portfolio', 'market'];
        if (!validTypes.includes(subscription.type)) {
            throw new Error('Invalid subscription type');
        }
        return true;
    }

    static async calculateRiskPriority(alerts) {
        const riskLevels = {
            'critical': 1,
            'high': 2,
            'medium': 3,
            'low': 4
        };
        return Math.min(...alerts.map(alert => riskLevels[alert.level] || 4));
    }
}

export default WebSocketHelpers;