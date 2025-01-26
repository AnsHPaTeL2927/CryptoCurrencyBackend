import RedisClient from '../../config/redis/client.js';
import RedisHelpers from '../../utils/helpers/redis.helper.js';
import logger from '../../utils/logger.js';

class RedisService {
    constructor() {
        this.client = RedisClient.getClient();
    }

    // Core Operations
    async set(key, value, expiry = null) {
        try {
            const serializedValue = RedisHelpers.serializeValue(value);
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

    async get(key) {
        try {
            const value = await this.client.get(key);
            return RedisHelpers.deserializeValue(value);
        } catch (error) {
            logger.error('Redis GET Error:', error);
            throw error;
        }
    }

    async delete(key) {
        try {
            await this.client.del(key);
        } catch (error) {
            logger.error('Redis DELETE Error:', error);
            throw error;
        }
    }

    // Hash Operations
    async hset(hash, field, value) {
        try {
            await this.client.hset(
                hash,
                field,
                RedisHelpers.serializeValue(value)
            );
        } catch (error) {
            logger.error('Redis HSET Error:', error);
            throw error;
        }
    }

    async hget(hash, field) {
        try {
            const value = await this.client.hget(hash, field);
            return RedisHelpers.deserializeValue(value);
        } catch (error) {
            logger.error('Redis HGET Error:', error);
            throw error;
        }
    }

    async hdel(hash, field) {
        try {
            await this.client.hdel(hash, field);
        } catch (error) {
            logger.error('Redis HDEL Error:', error);
            throw error;
        }
    }

    // Cache Management
    async clearCache(type) {
        try {
            const pattern = await RedisHelpers.buildKeyPattern(type);
            const keys = await this.client.keys(pattern);
            if (keys.length) {
                await RedisHelpers.processBatchOperation(
                    this.client,
                    'del',
                    keys.map(key => [key])
                );
            }
        } catch (error) {
            logger.error('Cache Clear Error:', error);
            throw error;
        }
    }

    async getCacheStatus(detailed = false) {
        try {
            const info = await this.client.info();
            const parsedInfo = RedisHelpers.parseRedisInfo(info);
            const status = {
                keys: await this.client.dbsize(),
                memory: await RedisHelpers.getMemoryUsage(parsedInfo),
                uptime: parsedInfo.uptime_in_seconds,
                connectedClients: parsedInfo.connected_clients
            };

            if (detailed) {
                status.keysByType = await this.getKeysByType();
            }

            return status;
        } catch (error) {
            logger.error('Cache Status Error:', error);
            throw error;
        }
    }

    // Session Management
    async setSocketSession(userId, socketId, expiry = 3600) {
        const key = RedisHelpers.formatCacheKey('socket', userId);
        await this.set(key, socketId, expiry);
    }

    async getSocketSession(userId) {
        const key = RedisHelpers.formatCacheKey('socket', userId);
        return await this.get(key);
    }

    // Data Caching
    async cacheMarketData(symbol, data) {
        const key = RedisHelpers.formatCacheKey('market', symbol);
        const expiry = RedisHelpers.generateExpiryTime('market');
        await this.set(key, data, expiry);
    }

    async getCachedMarketData(symbol) {
        const key = RedisHelpers.formatCacheKey('market', symbol);
        return await this.get(key);
    }

    async setPortfolioData(userId, data) {
        const key = RedisHelpers.formatCacheKey('portfolio', userId);
        const expiry = RedisHelpers.generateExpiryTime('user');
        await this.set(key, data, expiry);
    }

    async getPortfolioData(userId) {
        const key = RedisHelpers.formatCacheKey('portfolio', userId);
        return await this.get(key);
    }

    // List Operations
    async lpush(key, value) {
        try {
            await this.client.lpush(
                key,
                RedisHelpers.serializeValue(value)
            );
        } catch (error) {
            logger.error('Redis LPUSH Error:', error);
            throw error;
        }
    }

    async rpop(key) {
        try {
            const value = await this.client.rpop(key);
            return RedisHelpers.deserializeValue(value);
        } catch (error) {
            logger.error('Redis RPOP Error:', error);
            throw error;
        }
    }

    // User Data Management  
    async clearUserData(userId) {
        try {
            const patterns = [
                `user:${userId}:*`,
                `portfolio:${userId}`,
                `socket:${userId}:*`
            ];

            for (const pattern of patterns) {
                const keys = await this.client.keys(pattern);
                if (keys.length) {
                    await RedisHelpers.processBatchOperation(
                        this.client,
                        'del',
                        keys.map(key => [key])
                    );
                }
            }
        } catch (error) {
            logger.error('Clear User Data Error:', error);
            throw error;
        }
    }

    async refreshCache(type, force = false) {
        try {
            if (!await RedisHelpers.validateCacheType(type)) {
                throw new Error('Invalid cache type');
            }

            if (force) {
                await this.clearCache(type);
            }

            const data = await RedisHelpers.rebuildCache(type);
            return data;
        } catch (error) {
            logger.error('Cache Refresh Error:', error);
            throw error;
        }
    }

    async getCacheMetrics() {
        try {
            const metrics = {
                global: {
                    total_keys: await this.client.dbsize(),
                    memory_used: (await this.client.info()).used_memory_human
                },
                types: {}
            };

            const types = ['market', 'user', 'technical', 'trades'];
            for (const type of types) {
                const pattern = await RedisHelpers.buildKeyPattern(type);
                const keys = await this.client.keys(pattern);
                metrics.types[type] = RedisHelpers.getMetricsForType(type);
                metrics.types[type].keys_count = keys.length;
            }

            return metrics;
        } catch (error) {
            logger.error('Cache Metrics Error:', error);
            throw error;
        }
    }

    async getUptime() {
        try {
            const info = await this.client.info();
            return {
                server_uptime: info.uptime_in_seconds,
                connected_clients: info.connected_clients
            };
        } catch (error) {
            logger.error('Get Uptime Error:', error);
            throw error;
        }
    }

    async getMemoryUsage() {
        try {
            const info = await this.client.info();
            return await RedisHelpers.getMemoryUsage(info);
        } catch (error) {
            logger.error('Memory Usage Error:', error);
            throw error;
        }
    }

    async getHitRate() {
        try {
            const info = await this.client.info();
            const hits = parseInt(info.keyspace_hits);
            const misses = parseInt(info.keyspace_misses);
            return await RedisHelpers.calculateHitRate(hits, misses);
        } catch (error) {
            logger.error('Hit Rate Error:', error);
            throw error;
        }
    }
}

export default new RedisService();