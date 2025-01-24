// services/websocket.service.js
import SocketServer from '../../config/websocket/socket.js';
import { RedisService } from '../redis/cache.service.js';
import logger from '../../utils/logger.js';

class WebSocketService {
    constructor() {
        this.io = SocketServer.getIO();
    }

    /**
     * Subscribe user to portfolio updates
     */
    async subscribeToPortfolioUpdates(userId) {
        try {
            const socketId = await RedisService.get(`user:${userId}:socket`);
            if (socketId) {
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.join(`portfolio:${userId}`);
                    logger.info(`User ${userId} subscribed to portfolio updates`);
                }
            }
        } catch (error) {
            logger.error('Portfolio subscription error:', error);
            throw error;
        }
    }

    /**
     * Emit portfolio value update
     */
    async emitPortfolioValue(userId, value) {
        try {
            this.io.to(`portfolio:${userId}`).emit('portfolio_value_update', {
                timestamp: Date.now(),
                value
            });
        } catch (error) {
            logger.error('Portfolio value emit error:', error);
            throw error;
        }
    }

    /**
     * Emit trade update
     */
    async emitTradeUpdate(userId, data) {
        try {
            this.io.to(`portfolio:${userId}`).emit('trade_update', {
                timestamp: Date.now(),
                ...data
            });
        } catch (error) {
            logger.error('Trade update emit error:', error);
            throw error;
        }
    }

    /**
     * Emit portfolio update
     */
    async emitPortfolioUpdate(userId, data) {
        try {
            this.io.to(`portfolio:${userId}`).emit('portfolio_update', {
                timestamp: Date.now(),
                ...data
            });
        } catch (error) {
            logger.error('Portfolio update emit error:', error);
            throw error;
        }
    }

    /**
     * Emit price alert
     */
    async emitPriceAlert(userId, alert) {
        try {
            this.io.to(`portfolio:${userId}`).emit('price_alert', {
                timestamp: Date.now(),
                ...alert
            });
        } catch (error) {
            logger.error('Price alert emit error:', error);
            throw error;
        }
    }

    /**
     * Subscribe to market data
     */
    async subscribeToMarket(userId, symbols) {
        try {
            const socketId = await RedisService.get(`user:${userId}:socket`);
            if (socketId) {
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    symbols.forEach(symbol => {
                        socket.join(`market:${symbol}`);
                    });
                    logger.info(`User ${userId} subscribed to market data: ${symbols.join(', ')}`);
                }
            }
        } catch (error) {
            logger.error('Market subscription error:', error);
            throw error;
        }
    }

    /**
     * Broadcast market price update
     */
    async broadcastMarketPrice(symbol, priceData) {
        try {
            this.io.to(`market:${symbol}`).emit('market_price_update', {
                symbol,
                timestamp: Date.now(),
                ...priceData
            });
        } catch (error) {
            logger.error('Market price broadcast error:', error);
            throw error;
        }
    }

    /**
     * Disconnect user
     */
    async disconnectUser(userId) {
        try {
            const socketId = await RedisService.get(`user:${userId}:socket`);
            if (socketId) {
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.disconnect(true);
                    await RedisService.delete(`user:${userId}:socket`);
                    logger.info(`User ${userId} disconnected`);
                }
            }
        } catch (error) {
            logger.error('User disconnect error:', error);
            throw error;
        }
    }
}

export default new WebSocketService();