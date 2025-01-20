// integrations/index.js
import { coinGeckoAPI } from './coingecko/api.js';
import { coinCapAPI } from './coincap/api.js';
import { WebSocketManager } from './websocket/manager.js';

class IntegrationManager {
  constructor() {
    this.apis = {
      coingecko: coinGeckoAPI,
      coincap: coinCapAPI
    };
    
    this.ws = new WebSocketManager();
    this.initialized = false;
  }

  // Initialize all integrations
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize WebSocket connections
      await this.ws.initialize();
      
      this.initialized = true;
      console.log('All integrations initialized successfully');
    } catch (error) {
      console.error('Failed to initialize integrations:', error);
      throw error;
    }
  }

  // Market Data Methods
  async getMarketData(options = {}) {
    try {
      // Get data from multiple sources
      const [geckoData, capData] = await Promise.all([
        this.apis.coingecko.getMarketData(options),
        this.apis.coincap.getMarkets(options)
      ]);

      // Combine and normalize data
      return this.combineMarketData(geckoData, capData);
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Fallback to single source if one fails
      return this.apis.coingecko.getMarketData(options);
    }
  }

  // Price Methods
  async getPrices(coinIds, currency = 'usd') {
    try {
      const prices = await this.apis.coingecko.getCurrentPrices(coinIds, currency);
      return prices;
    } catch (error) {
      console.error('Error fetching prices:', error);
      // Fallback to CoinCap
      return this.apis.coincap.getPrices(coinIds, currency);
    }
  }

  // Historical Data
  async getHistoricalData(coinId, timeframe) {
    try {
      const data = await this.apis.coingecko.getMarketChart(coinId, timeframe);
      return data;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return this.apis.coincap.getAssetHistory(coinId, timeframe);
    }
  }

  // WebSocket Methods
  subscribeToPrice(coinIds, callback) {
    return this.ws.subscribeToPrices(coinIds, callback);
  }

  unsubscribeFromPrice(subscriptionId) {
    this.ws.unsubscribe(subscriptionId);
  }

  // Helper Methods
  combineMarketData(geckoData, capData) {
    // Combine and normalize data from different sources
    const combinedData = new Map();

    // Process CoinGecko data
    geckoData.forEach(item => {
      combinedData.set(item.id, {
        id: item.id,
        symbol: item.symbol,
        name: item.name,
        price: item.currentPrice,
        marketCap: item.marketCap,
        volume: item.totalVolume,
        change24h: item.priceChangePercentage24h,
        source: 'coingecko'
      });
    });

    // Merge CoinCap data
    capData.forEach(item => {
      if (!combinedData.has(item.id)) {
        combinedData.set(item.id, {
          id: item.id,
          symbol: item.symbol,
          name: item.name,
          price: parseFloat(item.priceUsd),
          marketCap: parseFloat(item.marketCapUsd),
          volume: parseFloat(item.volumeUsd24Hr),
          change24h: parseFloat(item.changePercent24Hr),
          source: 'coincap'
        });
      }
    });

    return Array.from(combinedData.values());
  }

  // Utility Methods
  isInitialized() {
    return this.initialized;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      websocket: this.ws.getStatus(),
      apis: {
        coingecko: {
          operational: true, // You might want to add health checks
          rateLimit: this.apis.coingecko.getRateLimitStatus()
        },
        coincap: {
          operational: true,
          websocket: this.ws.getConnectionStatus()
        }
      }
    };
  }
}

// Create and export singleton instance
const integrationManager = new IntegrationManager();

// Export individual APIs for direct access if needed
export {
  integrationManager as default,
  coinGeckoAPI,
  coinCapAPI
};

// Export types
export * from './coingecko/types.js';
export * from './coincap/types.js';

// Export utilities
export * from './utils/transforms.js';
export * from './utils/validators.js';