// services/market/coincap.service.js
import WebSocket from 'ws';
import axios from 'axios';
import { redisClient } from '../../config/redis.js';
import { ApiError } from '../../utils/ApiError.js';

class CoinCapService {
  constructor() {
    this.baseURL = 'https://api.coincap.io/v2';
    this.wsURL = 'wss://ws.coincap.io/prices?assets=ALL';
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });
    this.ws = null;
    this.subscribers = new Map();
  }

  // Real-time WebSocket Connection
  initializeWebSocket() {
    if (this.ws) return;

    this.ws = new WebSocket(this.wsURL);

    this.ws.on('open', () => {
      console.log('CoinCap WebSocket Connected');
    });

    this.ws.on('message', (data) => {
      const prices = JSON.parse(data);
      this.notifySubscribers(prices);
    });

    this.ws.on('close', () => {
      console.log('CoinCap WebSocket Disconnected');
      setTimeout(() => this.initializeWebSocket(), 5000);
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket Error:', error);
    });
  }

  // Asset Data with Caching
  async getAssets(limit = 100, offset = 0) {
    try {
      const cacheKey = `assets:${limit}:${offset}`;
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const response = await this.api.get('/assets', {
        params: { limit, offset }
      });

      const processedData = this.processAssetData(response.data.data);
      await redisClient.setex(cacheKey, 30, JSON.stringify(processedData)); // Cache for 30 seconds

      return processedData;
    } catch (error) {
      throw new ApiError(error.response?.status || 500, 'CoinCap API Error: ' + error.message);
    }
  }

  // Historical Data
  async getAssetHistory(assetId, interval = 'd1') {
    try {
      const cacheKey = `asset:history:${assetId}:${interval}`;
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const response = await this.api.get(`/assets/${assetId}/history`, {
        params: { interval }
      });

      const processedData = this.processHistoricalData(response.data.data);
      const cacheDuration = interval === 'h1' ? 300 : 3600; // Cache for 5 minutes if hourly, 1 hour for daily
      await redisClient.setex(cacheKey, cacheDuration, JSON.stringify(processedData));

      return processedData;
    } catch (error) {
      throw new ApiError(error.response?.status || 500, 'CoinCap API Error: ' + error.message);
    }
  }

  // Market Data
  async getMarkets(assetId) {
    try {
      const cacheKey = `markets:${assetId}`;
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const response = await this.api.get(`/assets/${assetId}/markets`);
      await redisClient.setex(cacheKey, 60, JSON.stringify(response.data)); // Cache for 1 minute

      return response.data;
    } catch (error) {
      throw new ApiError(error.response?.status || 500, 'CoinCap API Error: ' + error.message);
    }
  }

  // WebSocket Subscription Management
  subscribe(callback) {
    const id = Math.random().toString(36).substr(2, 9);
    this.subscribers.set(id, callback);
    return id;
  }

  unsubscribe(id) {
    this.subscribers.delete(id);
  }

  // Helper Methods
  processAssetData(assets) {
    return assets.map(asset => ({
      id: asset.id,
      rank: parseInt(asset.rank),
      symbol: asset.symbol,
      name: asset.name,
      supply: parseFloat(asset.supply),
      maxSupply: asset.maxSupply ? parseFloat(asset.maxSupply) : null,
      marketCapUsd: parseFloat(asset.marketCapUsd),
      volumeUsd24Hr: parseFloat(asset.volumeUsd24Hr),
      priceUsd: parseFloat(asset.priceUsd),
      changePercent24Hr: parseFloat(asset.changePercent24Hr),
      vwap24Hr: parseFloat(asset.vwap24Hr)
    }));
  }

  processHistoricalData(data) {
    return data.map(item => ({
      timestamp: item.time,
      priceUsd: parseFloat(item.priceUsd),
      date: new Date(item.time).toISOString()
    }));
  }

  notifySubscribers(data) {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Subscriber callback error:', error);
      }
    });
  }
}

export const coinCapService = new CoinCapService();