// controllers/technical.controller.js
import { CryptoCompareService } from '../services/third-party/cryptocompare.service.js';
import { CoinCapService } from '../services/third-party/coincap.service.js';
import { RedisService } from '../services/redis/redis.service.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';

export class TechnicalController {
    static getTechnicalIndicators = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { indicators = ['RSI', 'MACD', 'EMA'], period = '1d', interval = '1h' } = req.query;

        if (!symbol) {
            throw new ApiError(400, 'Symbol is required');
        }

        const cacheKey = `technical:indicators:${symbol}:${period}:${interval}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const data = await CryptoCompareService.getTechnicalIndicators(
            symbol,
            indicators,
            period,
            interval
        );

        await RedisService.set(cacheKey, data, 300);
        res.json({ status: 'success', data });
    });

    static getIndicatorParameters = catchAsync(async (req, res) => {
        const { indicator } = req.query;

        const parameters = {
            RSI: { period: 14, oversold: 30, overbought: 70 },
            MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
            EMA: { periods: [9, 21, 50, 200] },
            Bollinger: { period: 20, stdDev: 2 },
            StochRSI: { period: 14, kPeriod: 3, dPeriod: 3 }
        };

        if (indicator && !parameters[indicator]) {
            throw new ApiError(400, 'Invalid indicator');
        }

        const data = indicator ? parameters[indicator] : parameters;
        res.json({ status: 'success', data });
    });

    static getArbitrageOpportunities = catchAsync(async (req, res) => {
        const { minSpread = 1, exchanges, symbols } = req.query;

        if (!symbols) {
            throw new ApiError(400, 'Symbols are required');
        }

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
            exchanges ? exchanges.split(',') : null
        );

        await RedisService.set(cacheKey, opportunities, 60);
        res.json({ status: 'success', data: opportunities });
    });

    static getArbitrageHistory = catchAsync(async (req, res) => {
        const { pair, timeframe = '24h', exchange } = req.query;

        if (!pair) {
            throw new ApiError(400, 'Trading pair is required');
        }

        const cacheKey = `arbitrage:history:${pair}:${timeframe}:${exchange || 'all'}`;
        const cachedHistory = await RedisService.get(cacheKey);
        if (cachedHistory) return res.json({ status: 'success', data: cachedHistory });

        const history = await CryptoCompareService.getHistoricalArbitrage(pair, timeframe, exchange);
        await RedisService.set(cacheKey, history, 300);

        res.json({ status: 'success', data: history });
    });

    static getVolumeAnalysis = catchAsync(async (req, res) => {
        const { symbol, period = '24h' } = req.params;

        if (!symbol) {
            throw new ApiError(400, 'Symbol is required');
        }

        const cacheKey = `volume:analysis:${symbol}:${period}`;
        const cachedData = await RedisService.get(cacheKey);
        if (cachedData) return res.json({ status: 'success', data: cachedData });

        const analysis = await CryptoCompareService.getVolumeAnalysis(symbol, period);
        await RedisService.set(cacheKey, analysis, 300);

        res.json({ status: 'success', data: analysis });
    });

    static analyzeArbitrageOpportunities(prices, minSpread, exchanges) {
        return prices.reduce((opportunities, price) => {
            // Arbitrage analysis logic here
            return opportunities;
        }, []);
    }

    static getVolumeAnalysis = catchAsync(async (req, res) => {
        const { symbol, period = '24h' } = req.params;
        const { exchange } = req.query;

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
        const { timeframe = '24h' } = req.query;

        const distribution = await CryptoCompareService.getVolumeDistribution(symbol, timeframe);
        res.json({ status: 'success', data: distribution });
    });

    static getVolumeAlerts = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { threshold = 2 } = req.query;

        const alerts = await CryptoCompareService.getVolumeAlerts(symbol, threshold);
        res.json({ status: 'success', data: alerts });
    });

    // Price Pattern Methods
    static getPricePatterns = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { timeframe = '1d' } = req.query;

        const patterns = await CryptoCompareService.getPricePatterns(symbol, timeframe);
        res.json({ status: 'success', data: patterns });
    });

    static getSupportResistance = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { period = '30d' } = req.query;

        const levels = await CryptoCompareService.getSupportResistance(symbol, period);
        res.json({ status: 'success', data: levels });
    });

    static getBreakoutLevels = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { sensitivity = 'medium' } = req.query;

        const breakouts = await CryptoCompareService.getBreakoutLevels(symbol, sensitivity);
        res.json({ status: 'success', data: breakouts });
    });

    // Momentum Methods
    static getMomentumIndicators = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { indicators = ['RSI', 'MACD'] } = req.query;

        const momentum = await CryptoCompareService.getMomentumIndicators(symbol, indicators);
        res.json({ status: 'success', data: momentum });
    });

    static getTrendStrength = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { period = '14d' } = req.query;

        const strength = await CryptoCompareService.getTrendStrength(symbol, period);
        res.json({ status: 'success', data: strength });
    });

    static getMomentumDivergence = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { indicator = 'RSI' } = req.query;

        const divergence = await CryptoCompareService.getMomentumDivergence(symbol, indicator);
        res.json({ status: 'success', data: divergence });
    });

    // Volatility Methods
    static getVolatilityMetrics = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { period = '30d' } = req.query;

        const metrics = await CryptoCompareService.getVolatilityMetrics(symbol, period);
        res.json({ status: 'success', data: metrics });
    });

    static getVolatilityBands = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { type = 'bollinger' } = req.query;

        const bands = await CryptoCompareService.getVolatilityBands(symbol, type);
        res.json({ status: 'success', data: bands });
    });

    static getRiskMetrics = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { metrics = ['sharpe', 'sortino'] } = req.query;

        const risk = await CryptoCompareService.getRiskMetrics(symbol, metrics);
        res.json({ status: 'success', data: risk });
    });

    // Market Depth Methods
    static getMarketDepth = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { limit = 100 } = req.query;

        const depth = await CryptoCompareService.getMarketDepth(symbol, limit);
        res.json({ status: 'success', data: depth });
    });

    static getLiquidityMetrics = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { timeframe = '1h' } = req.query;

        const liquidity = await CryptoCompareService.getLiquidityMetrics(symbol, timeframe);
        res.json({ status: 'success', data: liquidity });
    });

    static getOrderFlowAnalysis = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const { depth = 20 } = req.query;

        const orderFlow = await CryptoCompareService.getOrderFlowAnalysis(symbol, depth);
        res.json({ status: 'success', data: orderFlow });
    });
}

export default TechnicalController;