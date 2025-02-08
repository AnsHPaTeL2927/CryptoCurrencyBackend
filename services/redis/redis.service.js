import RedisClient from '../../config/redis/client.js';
import RedisHelpers from '../../utils/helpers/redis.helper.js';
import logger from '../../utils/logger.js';
import CryptoCompareService from '../../services/third-party/cryptocompare.service.js'

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

            if (keys.length > 0) {
                await RedisHelpers.processBatchOperation(
                    this.client,
                    'del',
                    keys.map(key => [key])
                );
            }

            return {
                keysCleared: keys.length,
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('Cache Clear Error:', error);
            throw new ApiError(500, 'Failed to clear cache: ' + error.message);
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
            const startTime = Date.now();
            let keysAffected = 0;
            const details = {};

            if (!await RedisHelpers.validateCacheType(type)) {
                throw new ApiError(400, 'Invalid cache type');
            }

            // Get initial cache state
            const initialKeys = await this.client.keys(RedisHelpers.buildKeyPattern(type));

            if (force) {
                // Clear existing cache if force refresh
                await this.clearCache(type);
                keysAffected += initialKeys.length;
            }

            // Rebuild cache based on type
            const rebuildResult = await this.rebuildCacheByType(type);
            keysAffected += rebuildResult.keysAffected;

            // Calculate performance metrics
            const endTime = Date.now();
            const refreshDuration = endTime - startTime;

            // Prepare detailed information
            details.refreshDuration = refreshDuration;
            details.initialKeyCount = initialKeys.length;
            details.finalKeyCount = await this.client.keys(RedisHelpers.buildKeyPattern(type)).length;
            details.rebuildStats = rebuildResult.stats;

            return {
                keysAffected,
                details
            };
        } catch (error) {
            logger.error('Cache refresh error:', error);
            throw new ApiError(500, `Failed to refresh cache: ${error.message}`);
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
            const metrics = info.split('\r\n').reduce((acc, line) => {
                const [key, value] = line.split(':');
                if (key && value) {
                    acc[key.trim()] = value.trim();
                }
                return acc;
            }, {});
            return {
                server_uptime: metrics.uptime_in_seconds,
                connected_clients: metrics.connected_clients
            };
        } catch (error) {
            logger.error('Get Uptime Error:', error);
            throw error;
        }
    }

    async getMemoryUsage() {
        try {
            const info = await this.client.info();
            const metrics = info.split('\r\n').reduce((acc, line) => {
                const [key, value] = line.split(':');
                if (key && value) {
                    acc[key.trim()] = value.trim();
                }
                return acc;
            }, {});
            return await RedisHelpers.getMemoryUsage(metrics);
        } catch (error) {
            logger.error('Memory Usage Error:', error);
            throw error;
        }
    }

    async getHitRate() {
        try {
            const info = await this.client.info();
            const metrics = info.split('\r\n').reduce((acc, line) => {
                const [key, value] = line.split(':');
                if (key && value) {
                    acc[key.trim()] = value.trim();
                }
                return acc;
            }, {});

            const hits = parseInt(metrics.keyspace_hits);
            const misses = parseInt(metrics.keyspace_misses);
            const hitRate = await RedisHelpers.calculateHitRate(hits, misses);

            return {
                hits,
                misses,
                hitRate: hitRate
            };
        } catch (error) {
            logger.error('Hit Rate Error:', error);
            throw error;
        }
    }

    async hgetall(hash) {
        try {
            const data = await this.client.hgetall(hash);
            return Object.entries(data).reduce((acc, [key, value]) => {
                acc[key] = RedisHelpers.deserializeValue(value);
                return acc;
            }, {});
        } catch (error) {
            logger.error('Redis HGETALL Error:', error);
            throw error;
        }
    }

    async getCacheStats(type) {
        try {
            const pattern = RedisHelpers.buildKeyPattern(type);
            const keys = await this.client.keys(pattern);

            const stats = {
                keyCount: keys.length,
                memoryUsage: await this.getMemoryUsage(),
                hitRate: await this.getHitRate(),
                lastUpdated: new Date()
            };

            if (type !== 'all') {
                stats.typeSpecific = await this.getTypeSpecificStats(type);
            }

            return stats;
        } catch (error) {
            logger.error('Error getting cache stats:', error);
            throw new ApiError(500, 'Failed to get cache statistics');
        }
    }

    async rebuildCacheByType(type) {
        const rebuildStrategies = {
            market: async () => this.rebuildMarketCache(),
            // user: async () => this.rebuildUserCache(),
            trades: async () => this.rebuildTradesCache(),
            technical: async () => this.rebuildTechnicalCache(),
            all: async () => this.rebuildAllCache()
        };

        if (!rebuildStrategies[type]) {
            throw new ApiError(400, `No rebuild strategy for cache type: ${type}`);
        }

        return await rebuildStrategies[type]();
    }

    async getTypeSpecificStats(type) {
        try {
            const stats = {
                keyCount: 0,
                dataTypes: {},
                expiryStats: {
                    withTTL: 0,
                    withoutTTL: 0,
                    averageTTL: 0
                }
            };

            const pattern = await RedisHelpers.buildKeyPattern(type);
            const keys = await this.client.keys(pattern);
            stats.keyCount = keys.length;

            let totalTTL = 0;

            for (const key of keys) {
                // Get key type
                const keyType = await this.client.type(key);
                stats.dataTypes[keyType] = (stats.dataTypes[keyType] || 0) + 1;

                // Get TTL
                const ttl = await this.client.ttl(key);
                if (ttl > 0) {
                    stats.expiryStats.withTTL++;
                    totalTTL += ttl;
                } else {
                    stats.expiryStats.withoutTTL++;
                }
            }

            // Calculate average TTL
            if (stats.expiryStats.withTTL > 0) {
                stats.expiryStats.averageTTL = totalTTL / stats.expiryStats.withTTL;
            }

            return stats;
        } catch (error) {
            logger.error('Error getting type specific stats:', error);
            throw error;
        }
    }

    async rebuildMarketCache() {
        try {
            const stats = {
                startTime: new Date(),
                processed: 0,
                updated: 0,
                failed: 0
            };

            // Get current prices for default symbols
            const defaultSymbols = ['BTC', 'ETH', 'BNB', 'XRP', 'ADA'];

            for (const symbol of defaultSymbols) {
                try {
                    // Using existing CryptoCompare service
                    const price = await CryptoCompareService.getSymbolPrice(symbol);

                    // Cache the price data
                    const key = RedisHelpers.formatCacheKey('market', symbol);
                    await this.set(key, {
                        price,
                        lastUpdated: new Date()
                    }, RedisHelpers.generateExpiryTime('market'));

                    stats.updated++;
                } catch (error) {
                    logger.error(`Failed to rebuild market cache for symbol ${symbol}:`, error);
                    stats.failed++;
                }
                stats.processed++;
            }

            stats.endTime = new Date();
            stats.duration = stats.endTime - stats.startTime;

            return {
                keysAffected: stats.updated,
                stats
            };
        } catch (error) {
            logger.error('Market cache rebuild error:', error);
            throw error;
        }
    }

    async rebuildTradesCache() {
        try {
            const stats = {
                startTime: new Date(),
                processed: 0,
                updated: 0,
                failed: 0
            };

            // Cache recent market prices for quick access
            const priceKey = RedisHelpers.formatCacheKey('market', 'prices');
            const currentPrices = await CryptoCompareService.getCurrentPrice();
            await this.set(priceKey, currentPrices, RedisHelpers.generateExpiryTime('trades'));

            stats.updated++;
            stats.processed++;

            stats.endTime = new Date();
            stats.duration = stats.endTime - stats.startTime;

            return {
                keysAffected: stats.updated,
                stats
            };
        } catch (error) {
            logger.error('Trades cache rebuild error:', error);
            throw error;
        }
    }

    async rebuildTechnicalCache() {
        try {
            const stats = {
                startTime: new Date(),
                processed: 0,
                updated: 0,
                failed: 0
            };

            const defaultSymbols = ['BTC', 'ETH'];

            for (const symbol of defaultSymbols) {
                try {
                    // Using existing CryptoCompare service
                    const technicalData = await CryptoCompareService.getMarketAnalysis(symbol);

                    const key = RedisHelpers.formatCacheKey('technical', symbol);
                    await this.set(key, technicalData, RedisHelpers.generateExpiryTime('technical'));

                    stats.updated++;
                } catch (error) {
                    logger.error(`Failed to rebuild technical cache for symbol ${symbol}:`, error);
                    stats.failed++;
                }
                stats.processed++;
            }

            stats.endTime = new Date();
            stats.duration = stats.endTime - stats.startTime;

            return {
                keysAffected: stats.updated,
                stats
            };
        } catch (error) {
            logger.error('Technical cache rebuild error:', error);
            throw error;
        }
    }

    async rebuildAllCache() {
        try {
            const stats = {
                startTime: new Date(),
                marketStats: null,
                tradeStats: null,
                technicalStats: null
            };

            // Rebuild all cache types in parallel
            const [marketResult, tradeResult, technicalResult] = await Promise.all([
                this.rebuildMarketCache(),
                this.rebuildTradesCache(),
                this.rebuildTechnicalCache()
            ]);

            stats.marketStats = marketResult.stats;
            stats.tradeStats = tradeResult.stats;
            stats.technicalStats = technicalResult.stats;
            stats.endTime = new Date();
            stats.duration = stats.endTime - stats.startTime;

            return {
                keysAffected:
                    marketResult.keysAffected +
                    tradeResult.keysAffected +
                    technicalResult.keysAffected,
                stats
            };
        } catch (error) {
            logger.error('All cache rebuild error:', error);
            throw error;
        }
    }
}

export default new RedisService();