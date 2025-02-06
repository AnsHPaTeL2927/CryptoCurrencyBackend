import CryptoCompareService from '../third-party/cryptocompare.service.js';
import CoinCapService from '../third-party/coincap.service.js';
import { EmitterService } from './emitter.service.js';
import logger from '../../utils/logger.js';

class StreamService {
    constructor() {
        this.streams = new Map();
    }

    // Price Stream Methods
    async startPriceStream(symbols, interval = 5000) {
        const streamId = `price:${symbols.join(',')}`;

        const intervalId = setInterval(async () => {
            try {
                for (const symbol of symbols) {
                const prices = await CryptoCompareService.getCurrentPrice();
                    if (prices[symbol]) {
                        await EmitterService.emitPriceUpdate(symbol, prices[symbol]);
                    }
                }
            } catch (error) {
                logger.error('Price stream error:', error);
            }
        }, interval);

        this.streams.set(streamId, intervalId);
        return streamId;
    }

    // OrderBook Stream Methods
    async startOrderBookStream(symbol, depth = 20, interval = 1000) {
        const streamId = `orderbook:${symbol}`;

        const intervalId = setInterval(async () => {
            try {
                const orderBook = await CryptoCompareService.getOrderBook(symbol, depth);
                await EmitterService.emitOrderBookUpdate(symbol, orderBook);
            } catch (error) {
                logger.error('OrderBook stream error:', error);
            }
        }, interval);

        this.streams.set(streamId, intervalId);
        return streamId;
    }

    // Trade Stream Methods
    async startTradeStream(pairs, interval = 2000) {
        const streamId = `trades:${pairs.join(',')}`;

        const intervalId = setInterval(async () => {
            try {
                const trades = await CoinCapService.getLatestTrades(pairs);
                for (const pair of pairs) {
                    if (trades[pair]) {
                        await EmitterService.emitTradeUpdate(pair, trades[pair]);
                    }
                }
            } catch (error) {
                logger.error('Trade stream error:', error);
            }
        }, interval);

        this.streams.set(streamId, intervalId);
        return streamId;
    }

    // Market Stream Methods
    async startMarketStream(markets, interval = 5000) {
        const streamId = `market:${markets.join(',')}`;

        const intervalId = setInterval(async () => {
            try {
                const marketData = await CoinCapService.getMarketsData(markets);
                for (const market of markets) {
                    if (marketData[market]) {
                        await EmitterService.emitMarketUpdate(market, marketData[market]);
                    }
                }
            } catch (error) {
                logger.error('Market stream error:', error);
            }
        }, interval);

        this.streams.set(streamId, intervalId);
        return streamId;
    }

    // Portfolio Stream Methods
    async startPortfolioStream(userId, interval = 10000) {
        const streamId = `portfolio:${userId}`;

        const intervalId = setInterval(async () => {
            try {
                const portfolioData = await this.getPortfolioData(userId);
                await EmitterService.emitPortfolioUpdate(userId, portfolioData);
            } catch (error) {
                logger.error('Portfolio stream error:', error);
            }
        }, interval);

        this.streams.set(streamId, intervalId);
        return streamId;
    }

    // Alert Stream Methods
    async startAlertStream(userId, alerts, interval = 30000) {
        const streamId = `alerts:${userId}`;

        const intervalId = setInterval(async () => {
            try {
                const triggeredAlerts = await this.checkAlerts(userId, alerts);
                if (triggeredAlerts.length > 0) {
                    await EmitterService.emitRiskAlert(userId, triggeredAlerts);
                }
            } catch (error) {
                logger.error('Alert stream error:', error);
            }
        }, interval);

        this.streams.set(streamId, intervalId);
        return streamId;
    }

    // Stream Management Methods
    stopStream(streamId) {
        const interval = this.streams.get(streamId);
        if (interval) {
            clearInterval(interval);
            this.streams.delete(streamId);
            logger.info(`Stream ${streamId} stopped`);
        }
    }

    stopAllStreams() {
        for (const [streamId, interval] of this.streams.entries()) {
            clearInterval(interval);
            this.streams.delete(streamId);
        }
        logger.info('All streams stopped');
    }

    getActiveStreams() {
        return Array.from(this.streams.keys());
    }

    isStreamActive(streamId) {
        return this.streams.has(streamId);
    }

    // Helper Methods
    async getPortfolioData(userId) {
        // Implement portfolio data fetching logic
        return {};
    }

    async checkAlerts(userId, alerts) {
        // Implement alert checking logic
        return [];
    }
}

export default new StreamService();