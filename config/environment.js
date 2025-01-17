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
  }
};