import app from './app.js';
import { connectDB } from './config/database.js';
import { environment } from './config/environment.js';
import logger from './utils/logger.js';

const startServer = async () => {
  await connectDB();
  
  app.listen(environment.port, () => {
    logger.info(`Server running in ${environment.nodeEnv} mode on port ${environment.port}`);
  });
};

startServer();