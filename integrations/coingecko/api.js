// integrations/coingecko/api.js
import axios from 'axios';
import { rateLimiter } from '../../middleware/rateLimiter.middleware.js';
import { transformCoinData, transformMarketData } from './transformer.js';
import { CoinGeckoError } from './types.js';

class CoinGeckoAPI {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.apiKey = process.env.COINGECKO_API_KEY;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'x-cg-api-key': this.apiKey
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => this.handleApiError(error)
    );
  }

  async getCurrentPrices(coinIds, vsCurrency = 'usd') {
    try {
      await rateLimiter.wait();
      
      const response = await this.client.get('/simple/price', {
        params: {
          ids: Array.isArray(coinIds) ? coinIds.join(',') : coinIds,
          vs_currencies: vsCurrency,
          include_24hr_change: true,
          include_market_cap: true,
          include_last_updated_at: true
        }
      });

      return transformCoinData.prices(response.data);
    } catch (error) {
      throw new CoinGeckoError('Failed to fetch current prices', error);
    }
  }

  async getCoinDetails(coinId) {
    try {
      await rateLimiter.wait();
      
      const response = await this.client.get(`/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: true,
          market_data: true,
          community_data: true,
          developer_data: true,
          sparkline: true
        }
      });

      return transformCoinData.details(response.data);
    } catch (error) {
      throw new CoinGeckoError('Failed to fetch coin details', error);
    }
  }

  async getMarketChart(coinId, days = '30', interval = 'daily') {
    try {
      await rateLimiter.wait();
      
      const response = await this.client.get(`/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days,
          interval
        }
      });

      return transformMarketData.chart(response.data);
    } catch (error) {
      throw new CoinGeckoError('Failed to fetch market chart', error);
    }
  }

  async getTrendingCoins() {
    try {
      await rateLimiter.wait();
      
      const response = await this.client.get('/search/trending');
      return transformCoinData.trending(response.data);
    } catch (error) {
      throw new CoinGeckoError('Failed to fetch trending coins', error);
    }
  }

  async getMarketData(params = {}) {
    try {
      await rateLimiter.wait();
      
      const response = await this.client.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 100,
          page: 1,
          sparkline: true,
          ...params
        }
      });

      return transformMarketData.markets(response.data);
    } catch (error) {
      throw new CoinGeckoError('Failed to fetch market data', error);
    }
  }

  // Changed from private to regular method
  handleApiError(error) {
    if (error.response) {
      // Server responded with error
      throw new CoinGeckoError(
        error.response.data.error || 'API request failed',
        error,
        error.response.status
      );
    } else if (error.request) {
      // Request made but no response
      throw new CoinGeckoError('No response from CoinGecko API', error, 503);
    } else {
      // Request setup error
      throw new CoinGeckoError('Request configuration error', error, 400);
    }
  }
}

export const coinGeckoAPI = new CoinGeckoAPI();