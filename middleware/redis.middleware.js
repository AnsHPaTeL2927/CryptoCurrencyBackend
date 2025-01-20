// middleware/redis.middleware.js
import { redisClient } from '../config/redis.js';
import { ApiError } from '../utils/ApiError.js';

export const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    try {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const key = `cache:${req.originalUrl}`;
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Store original send function
      const originalSend = res.json;

      // Override res.json method
      res.json = function (body) {
        // Store the response in cache
        redisClient.setex(key, duration, JSON.stringify(body));
        
        // Call original res.json with the response body
        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const rateLimiter = async (req, res, next) => {
  try {
    const key = `ratelimit:${req.ip}`;
    const limit = 100; // requests
    const window = 3600; // 1 hour in seconds

    const current = await redisClient.get(key);
    
    if (current && parseInt(current) >= limit) {
      throw new ApiError(429, 'Too many requests');
    }

    if (current) {
      await redisClient.setex(key, window, parseInt(current) + 1);
    } else {
      await redisClient.setex(key, window, 1);
    }

    next();
  } catch (error) {
    next(error);
  }
};