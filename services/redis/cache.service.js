import RedisClient from '../../config/redis/client.js';
import { RedisError } from '../../utils/errors/redis.error.js';
import logger from '../../utils/logger.js';

export class CacheService {
    static async set(key, value, expiry = null) {
        try {
            const serializedValue = JSON.stringify(value);
            if (expiry) {
                await RedisClient.getClient().setex(key, expiry, serializedValue);
            } else {
                await RedisClient.getClient().set(key, serializedValue);
            }
        } catch (error) {
            logger.error('Redis cache set error:', error);
            throw new RedisError('Failed to set cache', 'CACHE_SET_ERROR');
        }
    }

    static async get(key) {
        try {
            const value = await RedisClient.getClient().get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error('Redis cache get error:', error);
            throw new RedisError('Failed to get cache', 'CACHE_GET_ERROR');
        }
    }

    static async delete(key) {
        try {
            await RedisClient.getClient().del(key);
        } catch (error) {
            logger.error('Redis cache delete error:', error);
            throw new RedisError('Failed to delete cache', 'CACHE_DELETE_ERROR');
        }
    }

    static async setHash(hash, key, value) {
        try {
            await RedisClient.getClient().hset(hash, key, JSON.stringify(value));
        } catch (error) {
            logger.error('Redis hash set error:', error);
            throw new RedisError('Failed to set hash', 'HASH_SET_ERROR');
        }
    }

    static async getHash(hash, key) {
        try {
            const value = await RedisClient.getClient().hget(hash, key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error('Redis hash get error:', error);
            throw new RedisError('Failed to get hash', 'HASH_GET_ERROR');
        }
    }
}