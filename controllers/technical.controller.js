import CryptoCompareService from '../services/third-party/cryptocompare.service.js';
import { CoinCapService } from '../services/third-party/coincap.service.js';
import RedisService from '../services/redis/redis.service.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { TechnicalHelper } from '../utils/helpers/technical.helper.js';

export class TechnicalController {
    // Technical Indicator Methods
    static getTechnicalIndicators = catchAsync(async (req, res) => {
        const { symbol } = req.params;
        const {
            indicators = ['RSI', 'MACD', 'EMA', 'BB'],
            period = '1d',
            interval = '1h'
        } = req.query;

        const validPeriods = ['1d', '7d', '30d', '90d', '1y'];
        const validIntervals = ['5m', '15m', '30m', '1h', '4h', '1d'];

        if (!validPeriods.includes(period)) {
            throw new ApiError(400, `Invalid period. Valid values are: ${validPeriods.join(', ')}`);
        }

        if (!validIntervals.includes(interval)) {
            throw new ApiError(400, `Invalid interval. Valid values are: ${validIntervals.join(', ')}`);
        }
        // Validate inputs
        if (!symbol) {
            throw new ApiError(400, 'Symbol is required');
        }

        // Validate indicators (now support BB - Bollinger Bands)
        const validIndicators = ['RSI', 'MACD', 'EMA', 'BB'];
        const requestedIndicators = Array.isArray(indicators) ? indicators : indicators.split(',');

        const invalidIndicators = requestedIndicators.filter(ind => !validIndicators.includes(ind.toUpperCase()));
        if (invalidIndicators.length > 0) {
            throw new ApiError(400, `Invalid indicators: ${invalidIndicators.join(', ')}`);
        }

        // Try to get from cache
        const cacheKey = `technical:indicators:${symbol}:${period}:${interval}`;
        const cachedData = await RedisService.get(cacheKey);

        if (cachedData) {
            return res.json({
                status: 'success',
                source: 'cache',
                data: cachedData
            });
        }

        try {
            // Get price data from CryptoCompare
            const priceData = await CryptoCompareService.getHistoricalData(symbol, 100);
            const prices = priceData.map(d => d.close);

            const results = {
                technicalIndicators: {},
                signals: {},
                trends: {},
                performance: TechnicalHelper.calculatePerformanceMetrics(priceData),
                volatility: TechnicalHelper.calculateVolatilityMetrics(priceData),
                support_resistance: TechnicalHelper.calculateSupportResistance(priceData)
            };

            // Calculate requested indicators
            for (const indicator of requestedIndicators) {
                switch (indicator.toUpperCase()) {
                    case 'RSI':
                        const rsi = TechnicalHelper.calculateRSI(prices);
                        results.technicalIndicators.RSI = {
                            value: rsi.lastValue,
                            values: rsi.values.slice(-5), // Last 5 values for trend
                            timestamp: new Date()
                        };
                        results.signals.RSI = TechnicalHelper.getRSISignal(rsi.lastValue);
                        break;

                    case 'MACD':
                        const macd = TechnicalHelper.calculateMACD(prices);
                        results.technicalIndicators.MACD = {
                            macd: macd.macd,
                            signal: macd.signal,
                            histogram: macd.histogram,
                            values: {
                                macd: macd.values.macdLine.slice(-5),
                                signal: macd.values.signalLine.slice(-5),
                                histogram: macd.values.histogram.slice(-5)
                            },
                            timestamp: new Date()
                        };
                        results.signals.MACD = TechnicalHelper.getMACDSignal(
                            macd.macd,
                            macd.signal,
                            macd.histogram
                        );
                        break;

                    case 'EMA':
                        const ema = TechnicalHelper.calculateEMA(prices, 14);
                        results.technicalIndicators.EMA = {
                            value: ema.lastValue,
                            values: ema.values.slice(-5),
                            period: 14,
                            timestamp: new Date()
                        };
                        break;

                    case 'BB':
                        const bb = TechnicalHelper.calculateBollingerBands(prices);
                        results.technicalIndicators.BB = {
                            upper: bb.upper,
                            middle: bb.middle,
                            lower: bb.lower,
                            values: {
                                upper: bb.values.upper.slice(-5),
                                middle: bb.values.middle.slice(-5),
                                lower: bb.values.lower.slice(-5)
                            },
                            timestamp: new Date()
                        };
                        break;
                }
            }

            // Calculate overall trend
            results.trends = TechnicalHelper.calculateOverallTrend(results);

            const response = {
                ...results,
                metadata: {
                    symbol: symbol.toUpperCase(),
                    period,
                    interval,
                    indicators: requestedIndicators,
                    calculatedAt: new Date(),
                    nextUpdate: new Date(Date.now() + 300000) // 5 minutes cache
                }
            };

            // Cache the response
            await RedisService.set(cacheKey, response, 300);

            return res.json({
                status: 'success',
                source: 'api',
                data: response
            });

        } catch (error) {
            logger.error('Error calculating technical indicators:', error);
            throw new ApiError(500, `Failed to calculate technical indicators: ${error.message}`);
        }
    });

    static getIndicatorParameters = catchAsync(async (req, res) => {
        try {
            const { indicator } = req.query;

            // List of supported indicators
            const validIndicators = ['RSI', 'MACD', 'EMA', 'BB', 'StochRSI'];

            // Validate indicator if provided
            if (indicator && !validIndicators.includes(indicator.toUpperCase())) {
                throw new ApiError(400, `Invalid indicator. Valid indicators are: ${validIndicators.join(', ')}`);
            }

            // Detailed parameters with descriptions and ranges
            const parameters = {
                RSI: {
                    parameters: {
                        period: 14,
                        oversold: 30,
                        overbought: 70
                    },
                    ranges: {
                        period: { min: 2, max: 50, recommended: 14 },
                        oversold: { min: 20, max: 40, recommended: 30 },
                        overbought: { min: 60, max: 80, recommended: 70 }
                    },
                    description: "Relative Strength Index measures momentum of an asset's price changes",
                    usage: "Values above overbought indicate potential sell signals, below oversold indicate potential buy signals"
                },
                MACD: {
                    parameters: {
                        fastPeriod: 12,
                        slowPeriod: 26,
                        signalPeriod: 9
                    },
                    ranges: {
                        fastPeriod: { min: 8, max: 20, recommended: 12 },
                        slowPeriod: { min: 20, max: 30, recommended: 26 },
                        signalPeriod: { min: 5, max: 12, recommended: 9 }
                    },
                    description: "Moving Average Convergence Divergence shows trend direction and momentum",
                    usage: "Signal line crossovers and histogram changes indicate potential trading signals"
                },
                EMA: {
                    parameters: {
                        periods: [9, 21, 50, 200]
                    },
                    ranges: {
                        period: { min: 3, max: 200, recommended: [9, 21, 50, 200] }
                    },
                    description: "Exponential Moving Average gives more weight to recent prices",
                    usage: "Crossovers between different period EMAs can indicate trend changes"
                },
                BB: {
                    parameters: {
                        period: 20,
                        stdDev: 2
                    },
                    ranges: {
                        period: { min: 10, max: 50, recommended: 20 },
                        stdDev: { min: 1, max: 3, recommended: 2 }
                    },
                    description: "Bollinger Bands show volatility and potential price levels",
                    usage: "Price touching bands indicates potential reversal points"
                },
                StochRSI: {
                    parameters: {
                        period: 14,
                        kPeriod: 3,
                        dPeriod: 3
                    },
                    ranges: {
                        period: { min: 10, max: 30, recommended: 14 },
                        kPeriod: { min: 1, max: 10, recommended: 3 },
                        dPeriod: { min: 1, max: 10, recommended: 3 }
                    },
                    description: "Stochastic RSI combines RSI with Stochastic oscillator",
                    usage: "Values above 80 indicate overbought, below 20 indicate oversold"
                }
            };

            // Cache key based on indicator
            const cacheKey = `indicator:parameters:${indicator || 'all'}`;
            const cacheDuration = 86400; // 24 hours since these rarely change

            // Get from cache
            const cachedData = await RedisService.get(cacheKey);
            if (cachedData) {
                return res.json({
                    status: 'success',
                    source: 'cache',
                    data: cachedData
                });
            }

            const response = {
                status: 'success',
                source: 'direct',
                data: indicator ? parameters[indicator.toUpperCase()] : parameters,
                metadata: {
                    timestamp: new Date(),
                    supportedIndicators: validIndicators,
                    version: '1.0'
                }
            };

            // Cache the response
            await RedisService.set(cacheKey, response, cacheDuration);

            res.json(response);
        } catch (error) {
            logger.error('Error in getIndicatorParameters:', error);
            throw new ApiError(500, 'Failed to fetch indicator parameters');
        }
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