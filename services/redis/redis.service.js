// services/redis.service.js
import RedisClient from '../../config/redis/client.js';
import logger from '../../utils/logger.js';

class RedisService {
    constructor() {
        this.client = RedisClient.getClient();
    }

    /**
     * Set key-value pair with optional expiry
     */
    async set(key, value, expiry = null) {
        try {
            const serializedValue = JSON.stringify(value);
            if (expiry) {
                await this.client.setex(key, expiry, serializedValue);
            } else {
                await this.client.set(key, serializedValue);
            }
        } catch (error) {
            logger.error('Redis SET Error:', error);
            throw error;
        }
    }

    /**
     * Get value by key
     */
    async get(key) {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error('Redis GET Error:', error);
            throw error;
        }
    }

    /**
     * Delete key
     */
    async delete(key) {
        try {
            await this.client.del(key);
        } catch (error) {
            logger.error('Redis DELETE Error:', error);
            throw error;
        }
    }

    /**
     * Store hash field
     */
    async hset(hash, field, value) {
        try {
            await this.client.hset(hash, field, JSON.stringify(value));
        } catch (error) {
            logger.error('Redis HSET Error:', error);
            throw error;
        }
    }

    /**
     * Get hash field
     */
    async hget(hash, field) {
        try {
            const value = await this.client.hget(hash, field);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error('Redis HGET Error:', error);
            throw error;
        }
    }

    /**
     * Delete hash field
     */
    async hdel(hash, field) {
        try {
            await this.client.hdel(hash, field);
        } catch (error) {
            logger.error('Redis HDEL Error:', error);
            throw error;
        }
    }

    /**
     * Set with expiry for websocket sessions
     */
    async setSocketSession(userId, socketId, expiry = 3600) {
        try {
            await this.set(`user:${userId}:socket`, socketId, expiry);
        } catch (error) {
            logger.error('Socket Session SET Error:', error);
            throw error;
        }
    }

    /**
     * Get socket session
     */
    async getSocketSession(userId) {
        try {
            return await this.get(`user:${userId}:socket`);
        } catch (error) {
            logger.error('Socket Session GET Error:', error);
            throw error;
        }
    }

    /**
     * Cache market data
     */
    async cacheMarketData(symbol, data, expiry = 60) {
        try {
            await this.set(`market:${symbol}`, data, expiry);
        } catch (error) {
            logger.error('Market Data Cache Error:', error);
            throw error;
        }
    }

    /**
     * Get cached market data
     */
    async getCachedMarketData(symbol) {
        try {
            return await this.get(`market:${symbol}`);
        } catch (error) {
            logger.error('Market Data Get Error:', error);
            throw error;
        }
    }

    /**
     * Store user portfolio data
     */
    async setPortfolioData(userId, data, expiry = 300) {
        try {
            await this.set(`portfolio:${userId}`, data, expiry);
        } catch (error) {
            logger.error('Portfolio Cache Error:', error);
            throw error;
        }
    }

    /**
     * Get user portfolio data
     */
    async getPortfolioData(userId) {
        try {
            return await this.get(`portfolio:${userId}`);
        } catch (error) {
            logger.error('Portfolio Get Error:', error);
            throw error;
        }
    }

    /**
     * Store trade data
     */
    async setTradeData(tradeId, data, expiry = 3600) {
        try {
            await this.set(`trade:${tradeId}`, data, expiry);
        } catch (error) {
            logger.error('Trade Cache Error:', error);
            throw error;
        }
    }

    /**
     * Get trade data
     */
    async getTradeData(tradeId) {
        try {
            return await this.get(`trade:${tradeId}`);
        } catch (error) {
            logger.error('Trade Get Error:', error);
            throw error;
        }
    }

    /**
     * Clear user data (for logout/cleanup)
     */
    async clearUserData(userId) {
        try {
            const keys = [
                `user:${userId}:socket`,
                `portfolio:${userId}`,
                // Add other user-related keys to clear
            ];
            await Promise.all(keys.map(key => this.delete(key)));
        } catch (error) {
            logger.error('Clear User Data Error:', error);
            throw error;
        }
    }
}

export default new RedisService();