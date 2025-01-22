import logger from '../../utils/logger.js';
import { SocketError } from '../../utils/errors/socket.error.js';

export const socketErrorMiddleware = (err, socket, next) => {
  if (err instanceof SocketError) {
    logger.error('Socket Error:', { code: err.code, message: err.message });
    socket.emit('error', {
      code: err.code,
      message: err.message
    });
  } else {
    logger.error('Unexpected Socket Error:', err);
    socket.emit('error', {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    });
  }
  next();
};