// config/redis.js
import { createClient } from 'redis';
import { ApiError } from '../utils/ApiError.js';

class RedisClient {
  constructor() {
    this.client = null;
    this.isReady = false;
  }

  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        retry_strategy: (options) => {
          if (options.attempt > 10) {
            return new Error('Redis retry attempts exhausted');
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // Event Handlers
      this.client.on('connect', () => {
        console.log('Redis client connected');
      });

      this.client.on('ready', () => {
        this.isReady = true;
        console.log('Redis client ready');
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isReady = false;
      });

      this.client.on('end', () => {
        this.isReady = false;
        console.log('Redis client disconnected');
      });

      await this.client.connect();
    } catch (error) {
      console.error('Redis Connection Error:', error);
      throw new ApiError(500, 'Redis connection failed');
    }
  }

  // Get value
  async get(key) {
    try {
      if (!this.isReady) await this.connect();
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis Get Error:', error);
      return null;
    }
  }

  // Set value with expiration
  async setex(key, seconds, value) {
    try {
      if (!this.isReady) await this.connect();
      await this.client.setEx(key, seconds, value);
      return true;
    } catch (error) {
      console.error('Redis SetEx Error:', error);
      return false;
    }
  }

  // Delete key
  async del(key) {
    try {
      if (!this.isReady) await this.connect();
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis Del Error:', error);
      return false;
    }
  }

  // Set multiple values
  async mset(pairs) {
    try {
      if (!this.isReady) await this.connect();
      await this.client.mSet(pairs);
      return true;
    } catch (error) {
      console.error('Redis MSet Error:', error);
      return false;
    }
  }

  // Get multiple values
  async mget(keys) {
    try {
      if (!this.isReady) await this.connect();
      return await this.client.mGet(keys);
    } catch (error) {
      console.error('Redis MGet Error:', error);
      return null;
    }
  }

  // Cache with hash
  async hset(key, field, value) {
    try {
      if (!this.isReady) await this.connect();
      await this.client.hSet(key, field, value);
      return true;
    } catch (error) {
      console.error('Redis HSet Error:', error);
      return false;
    }
  }

  // Get hash field
  async hget(key, field) {
    try {
      if (!this.isReady) await this.connect();
      return await this.client.hGet(key, field);
    } catch (error) {
      console.error('Redis HGet Error:', error);
      return null;
    }
  }

  // Clear all keys with prefix
  async clearPrefix(prefix) {
    try {
      if (!this.isReady) await this.connect();
      const keys = await this.client.keys(`${prefix}*`);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Redis Clear Prefix Error:', error);
      return false;
    }
  }
}

export const redisClient = new RedisClient();