// integrations/coincap/api.js
import WebSocket from 'ws';
import axios from 'axios';
import { CoinCapTransform } from './transformer.js';
import { INTERVALS, WEBSOCKET_EVENTS } from './types.js';
import { redisClient } from '../../config/redis.js';
import { ApiError } from '../../utils/ApiError.js';

class CoinCapAPI {
  constructor() {
    this.baseURL = 'https://api.coincap.io/v2';
    this.wsURL = 'wss://ws.coincap.io/prices?assets=ALL';
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.COINCAP_API_KEY}`
      }
    });
    this.ws = null;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Initialize WebSocket connection
   */
  initializeWebSocket() {
    if (this.ws) return;

    this.ws = new WebSocket(this.wsURL);

    this.ws.on('open', () => {
      console.log('CoinCap WebSocket Connected');
      this.reconnectAttempts = 0;
    });

    this.ws.on('message', (data) => {
      try {
        const parsedData = JSON.parse(data);
        const transformedData = CoinCapTransform.transformPriceUpdate(parsedData);
        this.notifySubscribers(WEBSOCKET_EVENTS.PRICES, transformedData);
      } catch (error) {
        console.error('WebSocket message processing error:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('CoinCap WebSocket Disconnected');
      this.handleReconnection();
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket Error:', error);
      this.handleReconnection();
    });
  }

  /**
   * Get asset data with caching
   * @param {string} assetId - Asset identifier
   * @returns {Promise<Object>} Asset data
   */
  async getAsset(assetId) {
    try {
      const cacheKey = `coincap:asset:${assetId}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const response = await this.api.get(`/assets/${assetId}`);
      const transformedData = CoinCapTransform.transformAsset(response.data.data);

      await redisClient.setex(cacheKey, 30, JSON.stringify(transformedData));
      return transformedData;
    } catch (error) {
      throw new ApiError(
        error.response?.status || 500,
        `CoinCap API Error: ${error.message}`
      );
    }
  }

  /**
   * Get historical data with interval
   * @param {string} assetId - Asset identifier
   * @param {string} interval - Time interval
   * @returns {Promise<Array>} Historical data
   */
  async getAssetHistory(assetId, interval = INTERVALS.DAY) {
    try {
      const cacheKey = `coincap:history:${assetId}:${interval}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const response = await this.api.get(`/assets/${assetId}/history`, {
        params: { interval }
      });

      const transformedData = CoinCapTransform.transformHistory(response.data.data);

      const cacheDuration = interval === INTERVALS.MINUTE ? 60 : 300;
      await redisClient.setex(cacheKey, cacheDuration, JSON.stringify(transformedData));

      return transformedData;
    } catch (error) {
      throw new ApiError(
        error.response?.status || 500,
        `CoinCap API Error: ${error.message}`
      );
    }
  }

  /**
   * Subscribe to WebSocket updates
   * @param {string} event - Event type
   * @param {Function} callback - Callback function
   * @returns {string} Subscription ID
   */
  subscribe(event, callback) {
    const id = Math.random().toString(36).substr(2, 9);
    
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Map());
    }
    
    this.subscribers.get(event).set(id, callback);
    
    if (!this.ws) {
      this.initializeWebSocket();
    }
    
    return id;
  }

  /**
   * Unsubscribe from updates
   * @param {string} event - Event type
   * @param {string} id - Subscription ID
   */
  unsubscribe(event, id) {
    if (this.subscribers.has(event)) {
      this.subscribers.get(event).delete(id);
    }
  }

  /**
   * Handle WebSocket reconnection
   * @private
   */
  handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(`Attempting to reconnect... Attempt ${this.reconnectAttempts}`);
      this.ws = null;
      this.initializeWebSocket();
    }, delay);
  }

  /**
   * Notify subscribers of updates
   * @private
   */
  notifySubscribers(event, data) {
    if (this.subscribers.has(event)) {
      this.subscribers.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Subscriber callback error:', error);
        }
      });
    }
  }
}

// Create singleton instance
const coincapAPI = new CoinCapAPI();

export default coincapAPI;