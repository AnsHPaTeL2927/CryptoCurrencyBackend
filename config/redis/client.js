import Redis from 'ioredis';
import { environment } from '../environment.js';
import logger from '../../utils/logger.js';

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    if (this.client) return this.client;

    // Simplified Redis configuration
    const redisConfig = {
      host: environment.REDIS_HOST || 'localhost',
      port: environment.REDIS_PORT || 6379,
      password: environment.REDIS_PASSWORD || 'null',  // Only pass password
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    };

    // Remove username and password if not provided
    if (!redisConfig.password) {
      delete redisConfig.password;
    }

    this.client = new Redis(redisConfig);

    this.setupEventListeners();
    return this.client;
  }

  setupEventListeners() {
    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis client connected');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis client disconnected');
    });

    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis client disconnected');
    }
  }

  getClient() {
    if (!this.client) {
      this.connect();
    }
    return this.client;
  }
}

export default new RedisClient();