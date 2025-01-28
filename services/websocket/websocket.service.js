import SocketServer from '../../config/websocket/socket.js';
import RedisService from '../redis/redis.service.js';
import logger from '../../utils/logger.js';
import WebSocketHelpers from '../../utils/helpers/websocket.helper.js';

class WebSocketService {
    constructor() {
        // this.io = SocketServer.getIO();
        this.subscriptions = new Map();
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

    async subscribeToCrypto(userId, symbols, subscription) {
        const socketId = await WebSocketHelpers.getUserSocket(userId);
        if (!socketId) return;

        const subKey = `crypto:${userId}:${symbols.join(',')}`;
        this.subscriptions.set(subKey, { userId, symbols, type: 'crypto', subscription });

        const io = SocketServer.getIO(); // Get IO instance when needed
        symbols.forEach(symbol => {
            io.to(socketId).join(`crypto:${symbol}`);
        });

        WebSocketHelpers.startDataStream(
            socketId,
            'crypto_update',
            () => CryptoCompareService.getCurrentPrice(symbols)
        );
    }

    async subscribeToTrades(userId, pairs) {
        const socketId = await WebSocketHelpers.getUserSocket(userId);
        if (!socketId) return;

        const subKey = `trades:${userId}:${pairs.join(',')}`;
        this.subscriptions.set(subKey, { userId, pairs, type: 'trades' });

        pairs.forEach(pair => {
            this.io.to(socketId).join(`trades:${pair}`);
        });

        WebSocketHelpers.startDataStream(
            socketId,
            'trade_update',
            () => CoinCapService.getLatestTrades(pairs),
            2000
        );
    }

    async subscribeToPrices(userId, symbols) {
        const socketId = await WebSocketHelpers.getUserSocket(userId);
        if (!socketId) return;

        const subKey = `prices:${userId}:${symbols.join(',')}`;
        this.subscriptions.set(subKey, { userId, symbols, type: 'prices' });

        symbols.forEach(symbol => {
            this.io.to(socketId).join(`prices:${symbol}`);
        });

        WebSocketHelpers.startDataStream(
            socketId,
            'price_update',
            () => CryptoCompareService.getSymbolPrices(symbols),
            1000
        );
    }

    async subscribeToOrderBook(userId, symbol, depth) {
        const socketId = await WebSocketHelpers.getUserSocket(userId);
        if (!socketId) return;

        const subKey = `orderbook:${userId}:${symbol}`;
        this.subscriptions.set(subKey, { userId, symbol, depth, type: 'orderbook' });

        this.io.to(socketId).join(`orderbook:${symbol}`);

        WebSocketHelpers.startDataStream(
            socketId,
            'orderbook_update',
            () => CryptoCompareService.getOrderBook(symbol, depth),
            1000
        );
    }

    async emitPriceUpdate(symbol, data) {
        try {
            const io = SocketServer.getIO();
            io.to(`prices:${symbol}`).emit('price_update', {
                symbol,
                data,
                timestamp: new Date()
            });
        } catch (error) {
            logger.error('Price update emission error:', error);
            throw error;
        }
    }

    async emitOrderBookUpdate(symbol, orderBook) {
        this.io.to(`orderbook:${symbol}`).emit('orderbook_update', {
            symbol,
            data: orderBook,
            timestamp: new Date()
        });
    }

    async emitMarketUpdate(market, data) {
        this.io.to(`market:${market}`).emit('market_update', {
            market,
            data,
            timestamp: new Date()
        });
    }

    async unsubscribe(userId, streamId) {
        const subscription = this.subscriptions.get(streamId);
        if (!subscription) return;

        const socketId = await WebSocketHelpers.getUserSocket(userId);
        if (!socketId) return;

        switch (subscription.type) {
            case 'crypto':
                subscription.symbols.forEach(symbol => {
                    this.io.to(socketId).leave(`crypto:${symbol}`);
                });
                break;
            case 'trades':
                subscription.pairs.forEach(pair => {
                    this.io.to(socketId).leave(`trades:${pair}`);
                });
                break;
            case 'prices':
                subscription.symbols.forEach(symbol => {
                    this.io.to(socketId).leave(`prices:${symbol}`);
                });
                break;
            case 'orderbook':
                this.io.to(socketId).leave(`orderbook:${subscription.symbol}`);
                break;
            case 'portfolio':
                this.io.to(socketId).leave(`portfolio:${userId}`);
                break;
            case 'market':
                subscription.markets.forEach(market => {
                    this.io.to(socketId).leave(`market:${market}`);
                });
                break;
        }

        await WebSocketHelpers.clearIntervals(socketId);
        this.subscriptions.delete(streamId);
        logger.info(`User ${userId} unsubscribed from ${streamId}`);
    }


    async getActiveSubscriptions(userId) {
        return Array.from(this.subscriptions.values())
            .filter(sub => sub.userId === userId);
    }

    async unsubscribe(userId, streamId) {
        const subscription = this.subscriptions.get(streamId);
        if (!subscription) return;

        const socketId = await WebSocketHelpers.getUserSocket(userId);
        if (!socketId) return;

        // Unsubscribe logic...
        await WebSocketHelpers.clearIntervals(socketId);
        this.subscriptions.delete(streamId);
    }

    async broadcastCacheUpdate(type, action) {
        this.io.emit('cache_update', {
            type,
            action,
            timestamp: new Date()
        });
    }

    async sendCacheStatus(userId, status) {
        const socketId = await WebSocketHelpers.getUserSocket(userId);
        if (socketId) {
            this.io.to(socketId).emit('cache_status', {
                status,
                timestamp: new Date()
            });
        }
    }

    async notifyCacheRefresh(type) {
        this.io.emit('cache_refresh', {
            type,
            timestamp: new Date()
        });
    }

    // websocket.service.js

    // Add these methods to WebSocketService class

    // BSCScan WebSocket Methods
    async emitBalanceUpdate(chain, address, balance) {
        this.io.to(`${chain}:${address}`).emit('balance_update', {
            chain,
            address,
            balance,
            timestamp: Date.now()
        });
    }

    // CoinCap WebSocket Methods
    async emitAssetUpdate(id, asset) {
        const io = SocketServer.getIO();
        try {
            io.to(`asset:${id}`).emit('asset_update', {
                id,
                data: asset,
                timestamp: Date.now()
            });
        }
        catch (error) {
            logger.error('Asset update emission error:', error);
            throw error;
        }
    }

    async emitListingsUpdate(listings) {
        this.io.emit('listings_update', {
            data: listings,
            timestamp: Date.now()
        });
    }

    // CoinMarketCap WebSocket Methods 
    async emitPriceFeed(symbol, data) {
        this.io.to(`price:${symbol}`).emit('price_feed', {
            symbol,
            data,
            timestamp: Date.now()
        });
    }

    async broadcastMarketMetrics(metrics) {
        this.io.emit('market_metrics', {
            data: metrics,
            timestamp: Date.now()
        });
    }

    // Etherscan WebSocket Methods
    async emitGasUpdate(gasPrice) {
        this.io.emit('gas_update', {
            data: gasPrice,
            timestamp: Date.now()
        });
    }

    async emitTransactionUpdate(address, transaction) {
        this.io.to(`address:${address}`).emit('transaction_update', {
            address,
            transaction,
            timestamp: Date.now()
        });
    }

    // Room Management
    async subscribeToAddress(userId, address, chain) {
        const socketId = await WebSocketHelpers.getUserSocket(userId);
        if (socketId) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.join(`${chain}:${address}`);
                socket.join(`address:${address}`);
            }
        }
    }

    async unsubscribeFromAddress(userId, address, chain) {
        const socketId = await WebSocketHelpers.getUserSocket(userId);
        if (socketId) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.leave(`${chain}:${address}`);
                socket.leave(`address:${address}`);
            }
        }
    }

    async subscribeToAsset(userId, assetId) {
        const socketId = await WebSocketHelpers.getUserSocket(userId);
        if (socketId) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.join(`asset:${assetId}`);
            }
        }
    }

    async subscribeToPriceFeed(userId, symbol) {
        const socketId = await WebSocketHelpers.getUserSocket(userId);
        if (socketId) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.join(`price:${symbol}`);
            }
        }
    }

    // Connection Management
    async handleChainConnection(userId, chain) {
        const connectionKey = `${chain}:connections:${userId}`;
        await RedisService.set(connectionKey, {
            connected: true,
            timestamp: Date.now()
        });
    }

    async handleChainDisconnection(userId, chain) {
        const connectionKey = `${chain}:connections:${userId}`;
        await RedisService.delete(connectionKey);
    }

    async emitRiskAlert(userId, alerts) {
        try {
            this.io.to(`portfolio:${userId}`).emit('risk_alert', {
                data: alerts,
                timestamp: Date.now(),
                priority: this.calculateRiskPriority(alerts),
                source: 'real-time'
            });
        } catch (error) {
            logger.error('Risk alert emission error:', error);
            throw error;
        }
    }
}

export default new WebSocketService();