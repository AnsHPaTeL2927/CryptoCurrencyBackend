// services/market/market.service.js
import { coinGeckoAPI } from '../integrations/coingecko/api.js';
import coincapAPI from '../integrations/coincap/api.js';
import { redisClient } from '../config/redis.js';
import { ApiError } from '../utils/ApiError.js';

class MarketService {
  constructor() {
    this.defaultCurrency = 'usd';
  }

  // Market Overview
  async getMarketOverview() {
    try {
      const cacheKey = 'market:overview';
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const [geckoData, capData, trending] = await Promise.all([
        coinGeckoAPI.getCurrentPrices('bitcoin,ethereum', this.defaultCurrency),
        coincapAPI.getAssets(),
        this.getTrendingCoins()
      ]);

      const overview = {
        timestamp: Date.now(),
        bitcoin: {
          price: geckoData.bitcoin?.usd || 0,
          change24h: geckoData.bitcoin?.usd_24h_change || 0
        },
        ethereum: {
          price: geckoData.ethereum?.usd || 0,
          change24h: geckoData.ethereum?.usd_24h_change || 0
        },
        topGainers: this.processTopMovers(capData, 'gainers'),
        topLosers: this.processTopMovers(capData, 'losers'),
        trending
      };

      await redisClient.setex(cacheKey, 60, JSON.stringify(overview)); // Cache for 1 minute
      return overview;
    } catch (error) {
      throw new ApiError(500, 'Error fetching market overview: ' + error.message);
    }
  }

  // Get Current Prices
  async getCurrentPrices(coinIds, currency = 'usd') {
    try {
      const cacheKey = `prices:${coinIds.join(',')}_${currency}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const prices = await coinGeckoAPI.getCurrentPrices(coinIds, currency);
      await redisClient.setex(cacheKey, 30, JSON.stringify(prices)); // Cache for 30 seconds
      return prices;
    } catch (error) {
      throw new ApiError(500, 'Error fetching current prices: ' + error.message);
    }
  }

  // Get Historical Data
  async getPriceHistory(coinId, days = '30', interval = 'daily') {
    try {
      const cacheKey = `history:${coinId}:${days}:${interval}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const history = await coinGeckoAPI.getCoinHistory(coinId, days, interval);
      const processedHistory = this.processHistoricalData(history);

      const cacheDuration = interval === 'daily' ? 3600 : 300; // Cache for 1 hour if daily, 5 mins otherwise
      await redisClient.setex(cacheKey, cacheDuration, JSON.stringify(processedHistory));

      return processedHistory;
    } catch (error) {
      throw new ApiError(500, 'Error fetching price history: ' + error.message);
    }
  }

  // Get Trending Coins
  async getTrendingCoins() {
    try {
      const cacheKey = 'trending:coins';
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const trending = await coinGeckoAPI.getTrending();
      await redisClient.setex(cacheKey, 300, JSON.stringify(trending)); // Cache for 5 minutes
      return trending;
    } catch (error) {
      throw new ApiError(500, 'Error fetching trending coins: ' + error.message);
    }
  }

  // Helper Methods
  processTopMovers(data, type = 'gainers', limit = 5) {
    const sorted = [...data].sort((a, b) => {
      const changeA = parseFloat(a.changePercent24Hr) || 0;
      const changeB = parseFloat(b.changePercent24Hr) || 0;
      return type === 'gainers' ? changeB - changeA : changeA - changeB;
    });

    return sorted.slice(0, limit).map(coin => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      price: parseFloat(coin.priceUsd),
      change24h: parseFloat(coin.changePercent24Hr)
    }));
  }

  processHistoricalData(data) {
    return {
      prices: data.prices.map(([timestamp, price]) => ({
        timestamp,
        price: parseFloat(price.toFixed(8)),
        date: new Date(timestamp).toISOString()
      }))
    };
  }
}

export const marketService = new MarketService();