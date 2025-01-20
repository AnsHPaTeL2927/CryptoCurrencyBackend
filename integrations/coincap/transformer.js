// integrations/coincap/transform.js
import { ApiError } from '../../utils/ApiError.js';

export class CoinCapTransform {
  /**
   * Transform raw asset data to standardized format
   * @param {Object} data - Raw asset data from CoinCap
   * @returns {Object} Transformed asset data
   */
  static transformAsset(data) {
    if (!data) throw new ApiError(500, 'Invalid asset data');

    return {
      id: data.id,
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      price: parseFloat(data.priceUsd) || 0,
      marketCap: parseFloat(data.marketCapUsd) || 0,
      volume24h: parseFloat(data.volumeUsd24Hr) || 0,
      change24h: parseFloat(data.changePercent24Hr) || 0,
      supply: {
        current: parseFloat(data.supply) || 0,
        max: parseFloat(data.maxSupply) || null,
      },
      rank: parseInt(data.rank) || 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Transform historical data to standardized format
   * @param {Array} data - Raw historical data from CoinCap
   * @returns {Array} Transformed historical data
   */
  static transformHistory(data) {
    if (!Array.isArray(data)) throw new ApiError(500, 'Invalid historical data');

    return data.map(item => ({
      timestamp: item.time,
      date: new Date(item.time).toISOString(),
      price: parseFloat(item.priceUsd) || 0,
    }));
  }

  /**
   * Transform WebSocket price update
   * @param {Object} data - Raw WebSocket price data
   * @returns {Object} Transformed price update
   */
  static transformPriceUpdate(data) {
    return Object.entries(data).reduce((acc, [key, value]) => {
      acc[key] = {
        price: parseFloat(value),
        timestamp: Date.now()
      };
      return acc;
    }, {});
  }

  /**
   * Transform market data
   * @param {Object} data - Raw market data
   * @returns {Object} Transformed market data
   */
  static transformMarketData(data) {
    return {
      exchangeId: data.exchangeId,
      baseId: data.baseId,
      quoteId: data.quoteId,
      baseSymbol: data.baseSymbol,
      quoteSymbol: data.quoteSymbol,
      volumeUsd24Hr: parseFloat(data.volumeUsd24Hr) || 0,
      priceUsd: parseFloat(data.priceUsd) || 0,
      volumePercent: parseFloat(data.volumePercent) || 0
    };
  }
}