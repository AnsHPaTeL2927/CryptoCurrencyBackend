// integrations/coingecko/types.js
export class CoinGeckoError extends Error {
    constructor(message, originalError = null, statusCode = 500) {
      super(message);
      this.name = 'CoinGeckoError';
      this.statusCode = statusCode;
      this.originalError = originalError;
    }
  }
  
  export const CoinData = {
    id: String,
    symbol: String,
    name: String,
    marketData: {
      currentPrice: Object,
      marketCap: Object,
      totalVolume: Object,
      high24h: Object,
      low24h: Object,
      priceChange24h: Number,
      priceChangePercentage24h: Number,
      marketCapRank: Number,
      totalSupply: Number,
      circulatingSupply: Number
    },
    communityData: {
      twitterFollowers: Number,
      redditSubscribers: Number,
      telegramChannelUserCount: Number
    },
    developerData: {
      forks: Number,
      stars: Number,
      subscribers: Number,
      totalIssues: Number,
      closedIssues: Number,
      pullRequestsMerged: Number,
      pullRequestContributors: Number
    }
  };
  
  export const MarketData = {
    prices: Array, // [timestamp, price]
    marketCaps: Array, // [timestamp, marketCap]
    totalVolumes: Array // [timestamp, volume]
  };
  
  export const TrendingData = {
    coins: Array // [{id, name, symbol, market_cap_rank, thumb, score}]
  };
  
  // Rate limiter types
  export const RateLimitConfig = {
    FREE_TIER: {
      requests: 10,
      perSeconds: 60
    },
    PRO_TIER: {
      requests: 100,
      perSeconds: 60
    }
  };
  
  // API Response types
  export const ResponseTypes = {
    SUCCESS: 'success',
    ERROR: 'error',
    RATE_LIMITED: 'rate_limited'
  };
  
  // Market data parameters
  export const MarketParams = {
    ORDER: {
      MARKET_CAP_DESC: 'market_cap_desc',
      MARKET_CAP_ASC: 'market_cap_asc',
      VOLUME_DESC: 'volume_desc',
      VOLUME_ASC: 'volume_asc'
    },
    PRICE_CHANGE: {
      '1h': '1h',
      '24h': '24h',
      '7d': '7d',
      '14d': '14d',
      '30d': '30d',
      '200d': '200d',
      '1y': '1y'
    }
  };