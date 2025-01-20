// integrations/index.js
import { coinGeckoAPI } from '../integrations/coingecko/api.js';
import { coinCapAPI } from '../integrations/coincap/api.js';
import { getWebSocketServer } from '../websocket/websocket.js';

class IntegrationManager {
  constructor() {
    this.apis = {
      coingecko: coinGeckoAPI,
      coincap: coinCapAPI
    };
    
    this.wsServer = getWebSocketServer();
    this.initialized = false;
  }

  // Initialize all integrations
  async initialize() {
    if (this.initialized) return;

    try {
      // Verify API connections
      await Promise.all([
        this.apis.coingecko.getCurrentPrices(['bitcoin']), // Test API connection
        this.apis.coincap.getAssets() // Test API connection
      ]);
      
      this.initialized = true;
      console.log('All integrations initialized successfully');

      // Start price update broadcasting
      this.startPriceUpdates();
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

      return this.combineMarketData(geckoData, capData);
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Fallback to single source
      return this.apis.coingecko.getMarketData(options);
    }
  }

  // Start periodic price updates
  startPriceUpdates() {
    setInterval(async () => {
      try {
        const prices = await this.apis.coingecko.getCurrentPrices(
          ['bitcoin', 'ethereum', 'ripple']
        );
        
        // Broadcast to subscribed clients
        this.wsServer.broadcast({
          type: 'price_update',
          data: prices
        }, 'price_updates');

      } catch (error) {
        console.error('Price update error:', error);
      }
    }, 10000); // Update every 10 seconds
  }

  // Helper Methods
  combineMarketData(geckoData, capData) {
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

  // Status check
  getStatus() {
    return {
      initialized: this.initialized,
      websocket: {
        connected: this.wsServer.wss?.clients?.size || 0,
        status: this.wsServer.wss ? 'running' : 'stopped'
      },
      apis: {
        coingecko: {
          operational: true
        },
        coincap: {
          operational: true
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