// controllers/technical.controller.js
import { CryptoCompareService } from '../services/third-party/cryptocompare.service.js';
import { CoinCapService } from '../services/third-party/coincap.service.js';
import { RedisService } from '../services/redis/redis.service.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';

export class TechnicalController {
    // Technical Indicator Methods
    static getTechnicalIndicators = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { indicators = ['RSI', 'MACD', 'EMA'], period = '1d', interval = '1h' } = req.query;

        if (!symbol) throw new ApiError(400, 'Symbol is required');

        const cacheKey = `technical:indicators:${symbol}:${period}:${interval}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const data = await CryptoCompareService.getTechnicalIndicators(symbol, indicators, period, interval);
        await RedisService.set(cacheKey, data, 300);

        res.json({ status: 'success', data });
    });

    static getIndicatorParameters = catchAsync(async (req, res) => {
        const { indicator } = req.query;
        const validIndicators = ['RSI', 'MACD', 'EMA', 'Bollinger', 'StochRSI'];

        if (indicator && !validIndicators.includes(indicator)) {
            throw new ApiError(400, 'Invalid indicator');
        }

        const parameters = {
            RSI: { period: 14, oversold: 30, overbought: 70 },
            MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
            EMA: { periods: [9, 21, 50, 200] },
            Bollinger: { period: 20, stdDev: 2 },
            StochRSI: { period: 14, kPeriod: 3, dPeriod: 3 }
        };

        res.json({
            status: 'success',
            data: indicator ? parameters[indicator] : parameters
        });
    });

    // Arbitrage Analysis Methods
    static getArbitrageOpportunities = catchAsync(async (req, res) => {
        const { minSpread = 1, exchanges, symbols } = req.query;

        if (!symbols) throw new ApiError(400, 'Symbols are required');

        const cacheKey = `arbitrage:opportunities:${symbols}:${minSpread}:${exchanges || 'all'}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const prices = await Promise.all([
            CryptoCompareService.getPrices(symbols, exchanges),
            CoinCapService.getPrices(symbols, exchanges)
        ]);

        const opportunities = this.analyzeArbitrageOpportunities(
            prices,
            parseFloat(minSpread),
            exchanges?.split(',')
        );

        await RedisService.set(cacheKey, opportunities, 60);
        res.json({ status: 'success', data: opportunities });
    });

    static getArbitrageHistory = catchAsync(async (req, res) => {
        const { pair, timeframe = '24h', exchange } = req.query;

        if (!pair) throw new ApiError(400, 'Trading pair is required');

        const cacheKey = `arbitrage:history:${pair}:${timeframe}:${exchange || 'all'}`;
        const cachedHistory = await RedisService.get(cacheKey);
        if (cachedHistory) return res.json({ status: 'success', data: cachedHistory });

        const history = await CryptoCompareService.getHistoricalArbitrage(pair, timeframe, exchange);
        await RedisService.set(cacheKey, history, 300);

        res.json({ status: 'success', data: history });
    });

    // Volume Analysis Methods
    static getVolumeAnalysis = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { period = '24h', exchange } = req.query;

        if (!symbol) throw new ApiError(400, 'Symbol required');

        const cacheKey = `volume:analysis:${symbol}:${period}:${exchange || 'all'}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const analysis = await CryptoCompareService.getVolumeAnalysis(symbol, period, exchange);
        await RedisService.set(cacheKey, analysis, 300);

        res.json({ status: 'success', data: analysis });
    });

    static getVolumeDistribution = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { timeframe = '24h', exchange } = req.query;

        if (!symbol) throw new ApiError(400, 'Symbol required');

        const cacheKey = `volume:distribution:${symbol}:${timeframe}:${exchange || 'all'}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const distribution = await CryptoCompareService.getVolumeDistribution(symbol, timeframe, exchange);
        await RedisService.set(cacheKey, distribution, 300);

        res.json({ status: 'success', data: distribution });
    });

    static getVolumeAlerts = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { threshold = 2, timeframe = '24h' } = req.query;

        if (!symbol) throw new ApiError(400, 'Symbol required');

        const cacheKey = `volume:alerts:${symbol}:${threshold}:${timeframe}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const alerts = await CryptoCompareService.getVolumeAlerts(symbol, Number(threshold), timeframe);
        await RedisService.set(cacheKey, alerts, 60);

        res.json({ status: 'success', data: alerts });
    });

    // Price Pattern Methods
    static getPricePatterns = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { timeframe = '1d' } = req.query;

        if (!symbol) throw new ApiError(400, 'Symbol required');

        const cacheKey = `patterns:${symbol}:${timeframe}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const patterns = await CryptoCompareService.getPricePatterns(symbol, timeframe);
        await RedisService.set(cacheKey, patterns, 300);

        res.json({ status: 'success', data: patterns });
    });

    static getSupportResistance = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { period = '30d' } = req.query;

        if (!symbol) throw new ApiError(400, 'Symbol required');

        const cacheKey = `support-resistance:${symbol}:${period}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const levels = await CryptoCompareService.getSupportResistance(symbol, period);
        await RedisService.set(cacheKey, levels, 300);

        res.json({ status: 'success', data: levels });
    });

    static getBreakoutLevels = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { sensitivity = 'medium' } = req.query;
        const validSensitivities = ['low', 'medium', 'high'];

        if (!symbol) throw new ApiError(400, 'Symbol required');
        if (!validSensitivities.includes(sensitivity)) {
            throw new ApiError(400, 'Invalid sensitivity level');
        }

        const cacheKey = `breakouts:${symbol}:${sensitivity}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const breakouts = await CryptoCompareService.getBreakoutLevels(symbol, sensitivity);
        await RedisService.set(cacheKey, breakouts, 300);

        res.json({ status: 'success', data: breakouts });
    });

    // Momentum Methods
    static getMomentumIndicators = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { indicators = ['RSI', 'MACD'] } = req.query;

        if (!symbol) throw new ApiError(400, 'Symbol required');

        const cacheKey = `momentum:indicators:${symbol}:${indicators.join(',')}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const momentum = await CryptoCompareService.getMomentumIndicators(symbol, indicators);
        await RedisService.set(cacheKey, momentum, 300);

        res.json({ status: 'success', data: momentum });
    });

    static getTrendStrength = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { period = '14d' } = req.query;

        if (!symbol) throw new ApiError(400, 'Symbol required');

        const cacheKey = `trend:strength:${symbol}:${period}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const strength = await CryptoCompareService.getTrendStrength(symbol, period);
        await RedisService.set(cacheKey, strength, 300);

        res.json({ status: 'success', data: strength });
    });

    static getMomentumDivergence = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { indicator = 'RSI' } = req.query;
        const validIndicators = ['RSI', 'MACD', 'StochRSI'];

        if (!symbol) throw new ApiError(400, 'Symbol required');
        if (!validIndicators.includes(indicator)) {
            throw new ApiError(400, 'Invalid indicator');
        }

        const cacheKey = `momentum:divergence:${symbol}:${indicator}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const divergence = await CryptoCompareService.getMomentumDivergence(symbol, indicator);
        await RedisService.set(cacheKey, divergence, 300);

        res.json({ status: 'success', data: divergence });
    });

    // Volatility Methods
    static getVolatilityMetrics = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { period = '30d' } = req.query;

        if (!symbol) throw new ApiError(400, 'Symbol required');

        const cacheKey = `volatility:metrics:${symbol}:${period}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const metrics = await CryptoCompareService.getVolatilityMetrics(symbol, period);
        await RedisService.set(cacheKey, metrics, 300);

        res.json({ status: 'success', data: metrics });
    });

    static getVolatilityBands = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { type = 'bollinger' } = req.query;
        const validTypes = ['bollinger', 'keltner', 'donchian'];

        if (!symbol) throw new ApiError(400, 'Symbol required');
        if (!validTypes.includes(type)) {
            throw new ApiError(400, 'Invalid band type');
        }

        const cacheKey = `volatility:bands:${symbol}:${type}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const bands = await CryptoCompareService.getVolatilityBands(symbol, type);
        await RedisService.set(cacheKey, bands, 300);

        res.json({ status: 'success', data: bands });
    });

    static getRiskMetrics = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { metrics = ['sharpe', 'sortino'] } = req.query;
        const validMetrics = ['sharpe', 'sortino', 'treynor', 'beta', 'alpha'];

        if (!symbol) throw new ApiError(400, 'Symbol required');
        if (!metrics.every(m => validMetrics.includes(m))) {
            throw new ApiError(400, 'Invalid risk metric');
        }

        const cacheKey = `risk:metrics:${symbol}:${metrics.join(',')}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const risk = await CryptoCompareService.getRiskMetrics(symbol, metrics);
        await RedisService.set(cacheKey, risk, 300);

        res.json({ status: 'success', data: risk });
    });

    // Market Depth Methods
    static getMarketDepth = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { limit = 100 } = req.query;

        if (!symbol) throw new ApiError(400, 'Symbol required');
        if (limit < 1 || limit > 1000) {
            throw new ApiError(400, 'Invalid limit (1-1000)');
        }

        const cacheKey = `depth:market:${symbol}:${limit}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const depth = await CryptoCompareService.getMarketDepth(symbol, Number(limit));
        await RedisService.set(cacheKey, depth, 60);

        res.json({ status: 'success', data: depth });
    });

    static getLiquidityMetrics = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { timeframe = '1h' } = req.query;

        if (!symbol) throw new ApiError(400, 'Symbol required');

        const cacheKey = `liquidity:metrics:${symbol}:${timeframe}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const liquidity = await CryptoCompareService.getLiquidityMetrics(symbol, timeframe);
        await RedisService.set(cacheKey, liquidity, 300);

        res.json({ status: 'success', data: liquidity });
    });

    static getOrderFlowAnalysis = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { depth = 20 } = req.query;

        if (!symbol) throw new ApiError(400, 'Symbol required');
        if (depth < 1 || depth > 100) {
            throw new ApiError(400, 'Invalid depth (1-100)');
        }

        const cacheKey = `orderflow:${symbol}:${depth}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const orderFlow = await CryptoCompareService.getOrderFlowAnalysis(symbol, Number(depth));
        await RedisService.set(cacheKey, orderFlow, 60);

        res.json({ status: 'success', data: orderFlow });
    });

    // Helper Methods
    static analyzeArbitrageOpportunities(prices, minSpread, exchanges = []) {
        const opportunities = [];
        const exchangePairs = this.getExchangePairs(exchanges);

        exchangePairs.forEach(([exchange1, exchange2]) => {
            const price1 = prices[exchange1];
            const price2 = prices[exchange2];

            if (price1 && price2) {
                const spread = Math.abs((price1 - price2) / price1) * 100;

                if (spread >= minSpread) {
                    opportunities.push({
                        exchange1,
                        exchange2,
                        price1,
                        price2,
                        spread: Number(spread.toFixed(2)),
                        direction: price1 > price2 ? 'buy2_sell1' : 'buy1_sell2',
                        timestamp: new Date()
                    });
                }
            }
        });

        return opportunities.sort((a, b) => b.spread - a.spread);
    }

    static getExchangePairs(exchanges) {
        const pairs = [];
        const exchangeList = exchanges.length > 0 ? exchanges : ['binance', 'coinbase', 'kraken', 'huobi'];

        for (let i = 0; i < exchangeList.length; i++) {
            for (let j = i + 1; j < exchangeList.length; j++) {
                pairs.push([exchangeList[i], exchangeList[j]]);
            }
        }

        return pairs;
    }
}

export default TechnicalController;