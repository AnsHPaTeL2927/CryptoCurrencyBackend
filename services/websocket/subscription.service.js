import RedisService from '../redis/redis.service.js';
import StreamService from './stream.service.js';
import { RoomService } from './room.service.js';
import logger from '../../utils/logger.js';
import socket from '../../config/websocket/socket.js';

class SubscriptionService {
    constructor() {
        this.subscriptions = new Map();
    }

    // Crypto Subscriptions
    async subscribeToCrypto(socket, userId, symbols, options = {}) {
        try {
            // Create subscription record
            const subscriptionId = `crypto:${userId}:${Date.now()}`;
            const socketId = socket.id 
            const subscription = {
                id: subscriptionId,
                userId,
                symbols,
                socketId,
                type: 'crypto',
                options,
                createdAt: new Date().toISOString()
            };

            // Store in Redis
            await RedisService.hset('subscriptions', subscriptionId, subscription);

            // Start the stream
            await StreamService.startPriceStream(symbols, options.interval);

            // Join rooms
            for (const symbol of symbols) {
                await RoomService.joinRoom(socket, `crypto:${symbol}`);
            }

            this.subscriptions.set(subscriptionId, subscription);
            logger.info(`Crypto subscription created for user ${userId}`);

            return subscriptionId;
        } catch (error) {
            logger.error('Crypto subscription error:', error);
            throw error;
        }
    }

    // Trade Subscriptions
    async subscribeToTrades(userId, pairs) {
        try {
            const subscriptionId = `trades:${userId}:${Date.now()}`;
            const subscription = {
                id: subscriptionId,
                userId,
                pairs,
                type: 'trades',
                createdAt: new Date().toISOString()
            };

            await RedisService.hset('subscriptions', subscriptionId, subscription);
            await StreamService.startTradeStream(pairs);

            this.subscriptions.set(subscriptionId, subscription);
            logger.info(`Trade subscription created for user ${userId}`);

            return subscriptionId;
        } catch (error) {
            logger.error('Trade subscription error:', error);
            throw error;
        }
    }

    // Market Subscriptions
    async subscribeToMarket(userId, symbols) {
        try {
            const subscriptionId = `market:${userId}:${Date.now()}`;
            const subscription = {
                id: subscriptionId,
                userId,
                symbols,
                type: 'market',
                createdAt: new Date().toISOString()
            };

            await RedisService.hset('subscriptions', subscriptionId, subscription);
            await StreamService.startMarketStream(symbols);

            this.subscriptions.set(subscriptionId, subscription);
            logger.info(`Market subscription created for user ${userId}`);

            return subscriptionId;
        } catch (error) {
            logger.error('Market subscription error:', error);
            throw error;
        }
    }

    // OrderBook Subscriptions
    async subscribeToOrderBook(userId, symbol, depth) {
        try {
            const subscriptionId = `orderbook:${userId}:${symbol}`;
            const subscription = {
                id: subscriptionId,
                userId,
                symbol,
                depth,
                type: 'orderbook',
                createdAt: new Date().toISOString()
            };

            await RedisService.hset('subscriptions', subscriptionId, subscription);
            await StreamService.startOrderBookStream(symbol, depth);

            this.subscriptions.set(subscriptionId, subscription);
            logger.info(`OrderBook subscription created for user ${userId}`);

            return subscriptionId;
        } catch (error) {
            logger.error('OrderBook subscription error:', error);
            throw error;
        }
    }

    // Subscription Management
    async unsubscribe(userId, subscriptionId) {
        try {
            const subscription = await RedisService.hget('subscriptions', subscriptionId);
            if (!subscription || subscription.userId !== userId) {
                throw new Error('Subscription not found or unauthorized');
            }

            // Stop associated stream
            await StreamService.stopStream(subscriptionId);

            // Remove from Redis
            await RedisService.hdel('subscriptions', subscriptionId);

            // Remove from memory
            this.subscriptions.delete(subscriptionId);

            logger.info(`Subscription ${subscriptionId} removed for user ${userId}`);
        } catch (error) {
            logger.error('Unsubscribe error:', error);
            throw error;
        }
    }

    async getActiveSubscriptions(userId) {
        try {
            const allSubscriptions = await RedisService.hgetall('subscriptions');
            return Object.values(allSubscriptions)
                .filter(sub => sub.userId === userId)
                .map(sub => ({
                    ...sub,
                    active: this.subscriptions.has(sub.id)
                }));
        } catch (error) {
            logger.error('Get active subscriptions error:', error);
            throw error;
        }
    }

    // Cleanup
    async cleanup(socketId) {
        try {
            // Find all subscriptions for this socket
            const subscriptionsToRemove = Array.from(this.subscriptions.values())
                .filter(sub => sub.socketId === socketId);

            // Remove each subscription
            for (const sub of subscriptionsToRemove) {
                await this.unsubscribe(sub.userId, sub.id);
            }

            logger.info(`Cleaned up ${subscriptionsToRemove.length} subscriptions for socket ${socketId}`);
        } catch (error) {
            logger.error('Subscription cleanup error:', error);
            throw error;
        }
    }
}

export default new SubscriptionService();