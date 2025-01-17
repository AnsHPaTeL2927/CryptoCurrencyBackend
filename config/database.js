import mongoose from 'mongoose';
import { environment } from './environment.js';
import logger from '../utils/logger.js';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(environment.mongoUri);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};
