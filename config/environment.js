import dotenv from 'dotenv';

dotenv.config();

export const environment = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
    googleCallbackUrl: '/auth/google/callback'
  },
  backend: {
    url: process.env.BACKEND_URL || 'http://localhost:5000',
    googleCallbackPath: '/api/auth/google/callback'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    family: parseInt(process.env.REDIS_FAMILY) || 4,
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES) || 10,
    retryInterval: parseInt(process.env.REDIS_RETRY_INTERVAL) || 100,
    enableAutoPipelining: true,
    connectTimeout: 10000,
    disconnectTimeout: 2000,
    commandTimeout: 5000,
    keyPrefix: 'app:'
  },
  socket: {
    path: process.env.SOCKET_PATH || '/socket.io',
    corsOrigin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
    maxBufferSize: parseInt(process.env.SOCKET_MAX_BUFFER_SIZE) || 1e8,
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000
  },

  encryptionKey: {
    key: process.env.ENCRYPTION_KEY,
    algorithm: process.env.ALGORITHM
  },

  apis: {
    cryptocompare: {
      baseUrl: process.env.CRYPTOCOMPARE_API_URL,
      wsUrl: process.env.CRYPTOCOMPARE_WS_URL,
      apiKey: process.env.CRYPTOCOMPARE_API_KEY,
      rateLimit: 100000
    },

    coincap: {
      baseUrl: process.env.COINCAP_API_URL,
      wsUrl: process.env.COINCAP_WS_URL,
      rateLimit: 200
    },

    coinmarketcap: {
      baseUrl: process.env.CMC_API_URL,
      apiKey: process.env.CMC_API_KEY,
      rateLimit: 333
    },

    etherscan: {
      baseUrl: process.env.ETHERSCAN_API_URL,
      apiKey: process.env.ETHERSCAN_API_KEY,
      rateLimit: 100000
    },

    bscscan: {
      baseUrl: process.env.BSCSCAN_API_URL,
      apiKey: process.env.BSCSCAN_API_KEY,
      rateLimit: 100000
    }
  },

  websocket: {
    reconnectInterval: 5000,
    maxReconnectAttempts: 5
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
    max: parseInt(process.env.API_RATE_LIMIT)
  },

  cache: {
    prices: 60,
    assets: 300,
    news: 900,
    blockchain: 60
  }
};