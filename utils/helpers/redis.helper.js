import logger from '../../utils/logger.js';

export class RedisHelpers {
    static formatCacheKey(type, identifier) {
        return `${type}:${identifier}`;
    }

    static async validateCacheType(type) {
        const validTypes = ['market', 'user', 'trades', 'technical', 'all'];
        return validTypes.includes(type);
    }

    static serializeValue(value) {
        try {
            return JSON.stringify(value);
        } catch (error) {
            logger.error('Serialization Error:', error);
            throw error;
        }
    }

    static deserializeValue(value) {
        try {
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error('Deserialization Error:', error);
            throw error;
        }
    }

    static async processBatchOperation(client, operation, items) {
        const pipeline = client.pipeline();
        items.forEach(item => {
            pipeline[operation](...item);
        });
        return await pipeline.exec();
    }

    static async getMemoryUsage(info) {
        return {
            used: info.used_memory_human,
            peak: info.used_memory_peak_human,
            fragmentation: info.mem_fragmentation_ratio
        };
    }

    static async calculateHitRate(hits, misses) {
        const total = hits + misses;
        return total > 0 ? (hits / total) * 100 : 0;
    }

    static generateExpiryTime(type) {
        const expiryMap = {
            market: 60,
            technical: 300,
            user: 3600,
            trades: 60
        };
        return expiryMap[type] || 300;
    }

    static async buildKeyPattern(type, subType = null) {
        if (type === 'all') return '*';
        return subType ? `${type}:${subType}:*` : `${type}:*`;
    }

    static parseRedisInfo(info) {
        return info.split('\r\n').reduce((obj, line) => {
            const [key, value] = line.split(':');
            if (key && value) obj[key.trim()] = value.trim();
            return obj;
        }, {});
    }

    static async rebuildCache(type) {
        const rebuildStrategies = {
            market: async () => {
                // Market data rebuild logic
            },
            technical: async () => {
                // Technical data rebuild logic 
            },
            user: async () => {
                // User data rebuild logic
            }
        };
        return await rebuildStrategies[type]();
    }

    static getMetricsForType(type) {
        const typeMetrics = {
            hit_count: 0,
            miss_count: 0,
            keys_count: 0,
            memory_used: 0
        };
        return typeMetrics;
    }
}

export default RedisHelpers;