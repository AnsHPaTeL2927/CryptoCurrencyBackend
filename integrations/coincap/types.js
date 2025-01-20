// integrations/coincap/types.js
/**
 * @typedef {Object} CoinCapAsset
 * @property {string} id - Unique identifier
 * @property {string} rank - Market rank
 * @property {string} symbol - Asset symbol
 * @property {string} name - Asset name
 * @property {string} supply - Current supply
 * @property {string} maxSupply - Maximum supply
 * @property {string} marketCapUsd - Market cap in USD
 * @property {string} volumeUsd24Hr - 24h volume in USD
 * @property {string} priceUsd - Current price in USD
 * @property {string} changePercent24Hr - 24h price change percentage
 * @property {string} vwap24Hr - 24h Volume Weighted Average Price
 */

/**
 * @typedef {Object} CoinCapHistory
 * @property {string} priceUsd - Price in USD
 * @property {number} time - Timestamp
 * @property {string} date - Formatted date
 */

/**
 * @typedef {Object} WebSocketPriceUpdate
 * @property {string} base - Asset symbol
 * @property {string} quote - Quote currency
 * @property {string} price - Current price
 * @property {string} timestamp - Update timestamp
 */

export const INTERVALS = {
    MINUTE: 'm1',
    FIVE_MINUTES: 'm5',
    FIFTEEN_MINUTES: 'm15',
    THIRTY_MINUTES: 'm30',
    HOUR: 'h1',
    TWO_HOURS: 'h2',
    FOUR_HOURS: 'h4',
    EIGHT_HOURS: 'h8',
    TWELVE_HOURS: 'h12',
    DAY: 'd1'
  };
  
  export const WEBSOCKET_EVENTS = {
    PRICES: 'prices',
    TRADES: 'trades',
    BOOK: 'book'
  };