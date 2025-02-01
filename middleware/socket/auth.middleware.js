import jwt from 'jsonwebtoken';
import { environment } from '../../config/environment.js';
import { SocketError } from '../../utils/errors/socket.error.js';
import logger from '../../utils/logger.js';

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

    if (!token) {
      throw new SocketError('Authentication token missing', 'AUTH_ERROR');
    }

    const decoded = jwt.verify(token.replace('Bearer ', ''), environment.jwt.secret);
    socket.user = decoded;
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new SocketError('Authentication failed', 'AUTH_ERROR'));
  }
};
