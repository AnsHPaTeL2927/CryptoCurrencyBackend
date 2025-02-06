import SocketServer from '../../config/websocket/socket.js';
import RedisService from '../redis/redis.service.js';
import logger from '../../utils/logger.js';
import { emitterHelper } from '../../utils/helpers/websocket/emitter.helper.js';

export class EmitterService {
    static async emitToUser(userId, event, data) {
        try {
            const io = SocketServer.getIO();
            // Changed to use RedisService instead of CacheService
            const userSocket = await RedisService.hget('socket:connections', userId);

            if (userSocket) {
                io.to(userSocket.socketId).emit(event, {
                    ...data,
                    timestamp: Date.now()
                });
                logger.info(`Event ${event} emitted to user ${userId}`);
            }
        } catch (error) {
            logger.error('Socket emit error:', error);
            throw error;
        }
    }

    static async emitToRoom(room, event, data) {
        try {
            const io = SocketServer.getIO();
            io.to(room).emit(event, data);
            logger.info(`Event ${event} emitted to room ${room}`);
        } catch (error) {
            logger.error('Socket room emit error:', error);
            throw error;
        }
    }

    static async broadcast(event, data, except = null) {
        try {
            const io = SocketServer.getIO();
            if (except) {
                except.broadcast.emit(event, data);
            } else {
                io.emit(event, data);
            }
            logger.info(`Event ${event} broadcasted`);
        } catch (error) {
            logger.error('Socket broadcast error:', error);
            throw error;
        }
    }

     // Portfolio Related Emits
    static async emitPortfolioValue(userId, value) {
        try {
            const io = SocketServer.getIO();
            io.to(`portfolio:${userId}`).emit('portfolio_value_update', {
                timestamp: Date.now(),
                value
            });
        } catch (error) {
            logger.error('Portfolio value emit error:', error);
            throw error;
        }
    }

    static async emitPortfolioUpdate(userId, data) {
        try {
            const io = SocketServer.getIO();
            io.to(`portfolio:${userId}`).emit('portfolio_update', {
                timestamp: Date.now(),
                ...data
            });
        } catch (error) {
            logger.error('Portfolio update emit error:', error);
            throw error;
        }
    }

    // Trade Related Emits
    static async emitTradeUpdate(userId, data) {
        try {
            const io = SocketServer.getIO();
            io.to(`portfolio:${userId}`).emit('trade_update', {
                timestamp: Date.now(),
                ...data
            });
        } catch (error) {
            logger.error('Trade update emit error:', error);
            throw error;
        }
    }

    // Price Related Emits
    static async emitPriceUpdate(symbol, data) {
        try {
            const io = SocketServer.getIO();
            io.to(`crypto:${symbol}`).emit('price_update', {
                symbol,
                data,
                timestamp: new Date()
            });
        } catch (error) {
            logger.error('Price update emission error:', error);
            throw error;
        }
    }

    static async emitPriceFeed(symbol, data) {
        try {
            const io = SocketServer.getIO();
            io.to(`price:${symbol}`).emit('price_feed', {
                symbol,
                data,
                timestamp: Date.now()
            });
        } catch (error) {
            logger.error('Price feed emission error:', error);
            throw error;
        }
    }

    // Market Related Emits
    static async emitMarketUpdate(market, data) {
        try {
            const io = SocketServer.getIO();
            io.to(`market:${market}`).emit('market_update', {
                market,
                data,
                timestamp: new Date()
            });
        } catch (error) {
            logger.error('Market update emission error:', error);
            throw error;
        }
    }

    static async broadcastMarketMetrics(metrics) {
        try {
            const io = SocketServer.getIO();
            io.emit('market_metrics', {
                data: metrics,
                timestamp: Date.now()
            });
        } catch (error) {
            logger.error('Market metrics broadcast error:', error);
            throw error;
        }
    }

    // OrderBook Related Emits
    static async emitOrderBookUpdate(symbol, orderBook) {
        try {
            const io = SocketServer.getIO();
            io.to(`orderbook:${symbol}`).emit('orderbook_update', {
                symbol,
                data: orderBook,
                timestamp: new Date()
            });
        } catch (error) {
            logger.error('OrderBook update emission error:', error);
            throw error;
        }
    }

    // Chain Related Emits
    static async emitBalanceUpdate(chain, address, balance) {
        try {
            const io = SocketServer.getIO();
            io.to(`${chain}:${address}`).emit('balance_update', {
                chain,
                address,
                balance,
                timestamp: Date.now()
            });
        } catch (error) {
            logger.error('Balance update emission error:', error);
            throw error;
        }
    }

    static async emitGasUpdate(gasPrice) {
        try {
            const io = SocketServer.getIO();
            io.emit('gas_update', {
                data: gasPrice,
                timestamp: Date.now()
            });
        } catch (error) {
            logger.error('Gas update emission error:', error);
            throw error;
        }
    }

    static async emitTransactionUpdate(address, transaction) {
        try {
            const io = SocketServer.getIO();
            io.to(`address:${address}`).emit('transaction_update', {
                address,
                transaction,
                timestamp: Date.now()
            });
        } catch (error) {
            logger.error('Transaction update emission error:', error);
            throw error;
        }
    }

    // Asset Related Emits
    static async emitAssetUpdate(id, asset) {
        try {
            const io = SocketServer.getIO();
            io.to(`asset:${id}`).emit('asset_update', {
                id,
                data: asset,
                timestamp: Date.now()
            });
        } catch (error) {
            logger.error('Asset update emission error:', error);
            throw error;
        }
    }

    static async emitListingsUpdate(listings) {
        try {
            const io = SocketServer.getIO();
            io.emit('listings_update', {
                data: listings,
                timestamp: Date.now()
            });
        } catch (error) {
            logger.error('Listings update emission error:', error);
            throw error;
        }
    }

    // Alert Related Emits
    static async emitPriceAlert(userId, alert) {
        try {
            const io = SocketServer.getIO();
            io.to(`portfolio:${userId}`).emit('price_alert', {
                timestamp: Date.now(),
                ...alert
            });
        } catch (error) {
            logger.error('Price alert emit error:', error);
            throw error;
        }
    }

    async emitRiskAlert(userId, alerts) {
        try {
            const io = SocketServer.getIO();
            io.to(`portfolio:${userId}`).emit('risk_alert', {
                data: alerts,
                timestamp: Date.now(),
                priority: emitterHelper.calculateRiskPriority(alerts),
                source: 'real-time'
            });
        } catch (error) {
            logger.error('Risk alert emission error:', error);
            throw error;
        }
    }

    // Cache Related Emits
    static async broadcastCacheUpdate(type, action) {
        try {
            const io = SocketServer.getIO();
            io.emit('cache_update', {
                type,
                action,
                timestamp: new Date()
            });
        } catch (error) {
            logger.error('Cache update broadcast error:', error);
            throw error;
        }
    }

    static async sendCacheStatus(userId, status) {
        try {
            const io = SocketServer.getIO();
            io.to(userId).emit('cache_status', {
                status,
                timestamp: new Date()
            });
        } catch (error) {
            logger.error('Cache status emission error:', error);
            throw error;
        }
    }

    static async notifyCacheRefresh(type) {
        try {
            const io = SocketServer.getIO();
            io.emit('cache_refresh', {
                type,
                timestamp: new Date()
            });
        } catch (error) {
            logger.error('Cache refresh notification error:', error);
            throw error;
        }
    }
}
