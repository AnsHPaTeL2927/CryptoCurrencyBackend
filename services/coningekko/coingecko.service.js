// services/market/coingecko.service.js
import axios from 'axios';
import { redisClient } from '../../config/redis.js';
import { ApiError } from '../../utils/ApiError.js';

class CoinGeckoService {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });
  }

  // Current Prices with Caching
  async getCurrentPrices(coinIds, currency = 'usd') {
    try {
      const cacheKey = `prices:${coinIds.join(',')}_${currency}`;
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const response = await this.api.get('/simple/price', {
        params: {
          ids: coinIds.join(','),
          vs_currencies: currency,
          include_24hr_change: true,
          include_market_cap: true,
          include_last_updated_at: true
        }
      });

      await redisClient.setex(cacheKey, 30, JSON.stringify(response.data)); // Cache for 30 seconds
      return response.data;
    } catch (error) {
      throw new ApiError(error.response?.status || 500, 'CoinGecko API Error: ' + error.message);
    }
  }

  // Detailed Coin Information
  async getCoinDetails(coinId) {
    try {
      const cacheKey = `coin:details:${coinId}`;
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const response = await this.api.get(`/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: true,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        }
      });

      await redisClient.setex(cacheKey, 300, JSON.stringify(response.data)); // Cache for 5 minutes
      return response.data;
    } catch (error) {
      throw new ApiError(error.response?.status || 500, 'CoinGecko API Error: ' + error.message);
    }
  }

  // Historical Data with Custom Range
  async getHistoricalData(coinId, days = '30', interval = 'daily') {
    try {
      const cacheKey = `coin:history:${coinId}:${days}:${interval}`;
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const response = await this.api.get(`/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days,
          interval
        }
      });

      const processedData = this.processHistoricalData(response.data);
      const cacheDuration = days === '1' ? 300 : 3600; // Cache for 5 minutes if 24h data, 1 hour for others
      await redisClient.setex(cacheKey, cacheDuration, JSON.stringify(processedData));

      return processedData;
    } catch (error) {
      throw new ApiError(error.response?.status || 500, 'CoinGecko API Error: ' + error.message);
    }
  }

  // Trending Coins
  async getTrendingCoins() {
    try {
      const cacheKey = 'trending:coins';
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const response = await this.api.get('/search/trending');
      await redisClient.setex(cacheKey, 300, JSON.stringify(response.data)); // Cache for 5 minutes

      return response.data;
    } catch (error) {
      throw new ApiError(error.response?.status || 500, 'CoinGecko API Error: ' + error.message);
    }
  }

  // Market Data
  async getMarketData(category = 'cryptocurrency', order = 'market_cap_desc', perPage = 100, page = 1) {
    try {
      const cacheKey = `market:data:${category}:${order}:${perPage}:${page}`;
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const response = await this.api.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          category,
          order,
          per_page: perPage,
          page,
          sparkline: true,
          price_change_percentage: '1h,24h,7d'
        }
      });

      await redisClient.setex(cacheKey, 60, JSON.stringify(response.data)); // Cache for 1 minute
      return response.data;
    } catch (error) {
      throw new ApiError(error.response?.status || 500, 'CoinGecko API Error: ' + error.message);
    }
  }

  // Helper Methods
  processHistoricalData(data) {
    return {
      prices: data.prices.map(([timestamp, price]) => ({
        timestamp,
        price: parseFloat(price.toFixed(8))
      })),
      market_caps: data.market_caps.map(([timestamp, marketCap]) => ({
        timestamp,
        marketCap: Math.round(marketCap)
      })),
      total_volumes: data.total_volumes.map(([timestamp, volume]) => ({
        timestamp,
        volume: Math.round(volume)
      }))
    };
  }

  // Rate Limit Handling
  async handleRateLimit(retries = 3) {
    return new Promise((resolve) => {
      const delay = Math.pow(2, retries) * 1000; // Exponential backoff
      setTimeout(resolve, delay);
    });
  }
}

export const coinGeckoService = new CoinGeckoService();