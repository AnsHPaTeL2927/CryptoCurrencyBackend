import app from './app.js';
import http from 'http';
import { connectDB } from './config/database.js';
import { environment } from './config/environment.js';
import logger from './utils/logger.js';
import RedisClient from './config/redis/client.js';
import SocketServer from './config/websocket/socket.js';

const server = http.createServer(app);

const initializeServices = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('MongoDB Connected');

    // Connect to Redis
    await RedisClient.connect();
    logger.info('Redis Connected');

    // Initialize Socket.IO
    SocketServer.initialize(server);
    logger.info('WebSocket Server Initialized');

  } catch (error) {
    logger.error('Service initialization error:', error);
    process.exit(1);
  }
};

const setupGracefulShutdown = () => {
  // Handle graceful shutdown
  const shutdown = async () => {
    try {
      logger.info('Starting graceful shutdown');

      // Close HTTP server
      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Disconnect Redis
      await RedisClient.disconnect();
      logger.info('Redis disconnected');

      // Give time for cleanup
      setTimeout(() => {
        logger.info('Graceful shutdown completed');
        process.exit(0);
      }, 1000);

    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle different shutdown signals
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    shutdown();
  });
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown();
  });
};

const startServer = async () => {
  try {
    // Initialize all services
    await initializeServices();

    // Setup graceful shutdown handlers
    setupGracefulShutdown();

    // Start server
    server.listen(environment.port, () => {
      logger.info(`Server running in ${environment.nodeEnv} mode on port ${environment.port}`);
    });

  } catch (error) {
    logger.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer();