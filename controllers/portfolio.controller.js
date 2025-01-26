import PortfolioService from '../services/portfolio.service.js';
import WebSocketService from '../services/websocket/websocket.service.js';
import RedisService from '../services/redis/redis.service.js';
import { RateLimiter } from '../middleware/rateLimiter.middleware.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { validatePortfolioData, validateTimeframe } from '../validations/portfolio.validation.js';
import { sanitizeData, sanitizeTimeframe } from '../utils/sanitizer.js';

const CACHE_DURATIONS = {
    PORTFOLIO_OVERVIEW: 300,
    REAL_TIME_VALUE: 60,
    HISTORICAL_DATA: 3600,
    RISK_SCORE: 1800,
    ASSET_PERFORMANCE: 300,
    DAILY_CHANGE: 60,
    ROI_ANALYSIS: 900,
    ALLOCATION: 600,
    PNL_BREAKDOWN: 900,
    COST_BASIS: 1800,
    RISK_DISTRIBUTION: 1200,
    MARKET_DATA: 300,
    TAX_DATA: 3600
};

const sensitiveOpsLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100
});

export class PortfolioController {
    static getPortfolioOverview = catchAsync(async (req, res) => {
        const userId = req.user._id;

        const cachedOverview = await RedisService.getPortfolioData(userId);
        if (cachedOverview) {
            return res.status(200).json({
                status: 'success',
                data: cachedOverview,
                source: 'cache'
            });
        }

        const overview = await PortfolioService.getPortfolioOverview(userId);
        await WebSocketService.subscribeToPortfolioUpdates(userId);
        await RedisService.setPortfolioData(userId, overview, CACHE_DURATIONS.PORTFOLIO_OVERVIEW);

        res.status(200).json({
            status: 'success',
            data: overview,
            source: 'db'
        });
    });

    static getRealTimeValue = catchAsync(async (req, res) => {
        const userId = req.user._id;

        const cachedValue = await RedisService.get(`portfolio:realtime:${userId}`);
        if (cachedValue) {
            return res.status(200).json({
                status: 'success',
                data: cachedValue,
                source: 'cache'
            });
        }

        const value = await PortfolioService.getRealTimeValue(userId);
        await WebSocketService.emitPortfolioValue(userId, value);
        await RedisService.set(`portfolio:realtime:${userId}`, value, CACHE_DURATIONS.REAL_TIME_VALUE);

        res.status(200).json({
            status: 'success',
            data: value,
            source: 'calculation'
        });
    });

    static getAssetPerformance = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { timeframe = '24h' } = req.query;

        const validatedTimeframe = validateTimeframe(timeframe);
        const sanitizedTimeframe = sanitizeTimeframe(validatedTimeframe);

        const cacheKey = `portfolio:performance:${userId}:${sanitizedTimeframe}`;
        const cachedPerformance = await RedisService.get(cacheKey);
        if (cachedPerformance) {
            return res.status(200).json({
                status: 'success',
                data: cachedPerformance,
                source: 'cache'
            });
        }

        const performance = await PortfolioService.getAssetPerformance(userId, sanitizedTimeframe);
        await RedisService.set(cacheKey, performance, CACHE_DURATIONS.ASSET_PERFORMANCE);

        res.status(200).json({
            status: 'success',
            data: performance,
            source: 'calculation'
        });
    });

    static getDailyChange = catchAsync(async (req, res) => {
        const userId = req.user._id;

        const cacheKey = `portfolio:daily:${userId}`;
        const cachedChange = await RedisService.get(cacheKey);
        if (cachedChange) {
            return res.status(200).json({
                status: 'success',
                data: cachedChange,
                source: 'cache'
            });
        }

        const dailyChange = await PortfolioService.getDailyChange(userId);
        await RedisService.set(cacheKey, dailyChange, CACHE_DURATIONS.DAILY_CHANGE);

        res.status(200).json({
            status: 'success',
            data: dailyChange,
            source: 'calculation'
        });
    });

    static getROIAnalysis = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { period = 'all' } = req.query;

        if (!['all', '1y', '6m', '3m', '1m'].includes(period)) {
            throw new ApiError(400, 'Invalid period');
        }

        const cacheKey = `portfolio:roi:${userId}:${period}`;
        const cachedROI = await RedisService.get(cacheKey);
        if (cachedROI) {
            return res.status(200).json({
                status: 'success',
                data: cachedROI,
                source: 'cache'
            });
        }

        const roi = await PortfolioService.getROIAnalysis(userId, period);
        await RedisService.set(cacheKey, roi, CACHE_DURATIONS.ROI_ANALYSIS);

        res.status(200).json({
            status: 'success',
            data: roi,
            source: 'calculation'
        });
    });

    static getHistoricalPerformance = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { timeframe = 'all', interval = 'daily' } = req.query;

        if (!['all', '1y', '6m', '3m', '1m'].includes(timeframe)) {
            throw new ApiError(400, 'Invalid timeframe');
        }
        if (!['hourly', 'daily', 'weekly', 'monthly'].includes(interval)) {
            throw new ApiError(400, 'Invalid interval');
        }

        const cacheKey = `portfolio:history:${userId}:${timeframe}:${interval}`;
        const cachedHistory = await RedisService.get(cacheKey);
        if (cachedHistory) {
            return res.status(200).json({
                status: 'success',
                data: cachedHistory,
                source: 'cache'
            });
        }

        const history = await PortfolioService.getHistoricalPerformance(userId, timeframe, interval);
        await RedisService.set(cacheKey, history, CACHE_DURATIONS.HISTORICAL_DATA);

        res.status(200).json({
            status: 'success',
            data: history,
            source: 'calculation'
        });
    });

    static getAssetAllocation = catchAsync(async (req, res) => {
        const userId = req.user._id;

        const cacheKey = `portfolio:allocation:${userId}`;
        const cachedAllocation = await RedisService.get(cacheKey);
        if (cachedAllocation) {
            return res.status(200).json({
                status: 'success',
                data: cachedAllocation,
                source: 'cache'
            });
        }

        const allocation = await PortfolioService.getAssetAllocation(userId);
        await RedisService.set(cacheKey, allocation, CACHE_DURATIONS.ALLOCATION);

        res.status(200).json({
            status: 'success',
            data: allocation,
            source: 'calculation'
        });
    });

    static getProfitLossBreakdown = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { period = 'all' } = req.query;

        if (!['all', '1y', '6m', '3m', '1m'].includes(period)) {
            throw new ApiError(400, 'Invalid period');
        }

        const cacheKey = `portfolio:pnl:${userId}:${period}`;
        const cachedPnL = await RedisService.get(cacheKey);
        if (cachedPnL) {
            return res.status(200).json({
                status: 'success',
                data: cachedPnL,
                source: 'cache'
            });
        }

        const pnl = await PortfolioService.getProfitLossBreakdown(userId, period);
        await RedisService.set(cacheKey, pnl, CACHE_DURATIONS.PNL_BREAKDOWN);

        res.status(200).json({
            status: 'success',
            data: pnl,
            source: 'calculation'
        });
    });

    static getCostBasisAnalysis = catchAsync(async (req, res) => {
        const userId = req.user._id;

        const cacheKey = `portfolio:costbasis:${userId}`;
        const cachedAnalysis = await RedisService.get(cacheKey);
        if (cachedAnalysis) {
            return res.status(200).json({
                status: 'success',
                data: cachedAnalysis,
                source: 'cache'
            });
        }

        const analysis = await PortfolioService.getCostBasisAnalysis(userId);
        await RedisService.set(cacheKey, analysis, CACHE_DURATIONS.COST_BASIS);

        res.status(200).json({
            status: 'success',
            data: analysis,
            source: 'calculation'
        });
    });

    // Risk Management Methods
    static getPortfolioRiskScore = catchAsync(async (req, res) => {
        const userId = req.user._id;

        const cacheKey = `portfolio:risk:${userId}`;
        const cachedScore = await RedisService.get(cacheKey);
        if (cachedScore) {
            return res.status(200).json({
                status: 'success',
                data: cachedScore,
                source: 'cache'
            });
        }

        const riskScore = await PortfolioService.getPortfolioRiskScore(userId);
        if (!riskScore) {
            throw new ApiError(404, 'Risk score not found');
        }

        await RedisService.set(cacheKey, riskScore, CACHE_DURATIONS.RISK_SCORE);

        res.status(200).json({
            status: 'success',
            data: riskScore,
            source: 'calculation'
        });
    });

    static getRiskDistribution = catchAsync(async (req, res) => {
        const userId = req.user._id;

        const cacheKey = `portfolio:risk:distribution:${userId}`;
        const cachedDistribution = await RedisService.get(cacheKey);
        if (cachedDistribution) {
            return res.status(200).json({
                status: 'success',
                data: cachedDistribution,
                source: 'cache'
            });
        }

        const distribution = await PortfolioService.getRiskDistribution(userId);
        await RedisService.set(cacheKey, distribution, CACHE_DURATIONS.RISK_DISTRIBUTION);

        res.status(200).json({
            status: 'success',
            data: distribution,
            source: 'calculation'
        });
    });

    static getExposureAlerts = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const alerts = await PortfolioService.getExposureAlerts(userId);

        res.status(200).json({
            status: 'success',
            data: alerts
        });
    });

    static getDrawdownAnalysis = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { period = 'all' } = req.query;

        if (!['all', '1y', '6m', '3m', '1m'].includes(period)) {
            throw new ApiError(400, 'Invalid period');
        }

        const cacheKey = `portfolio:drawdown:${userId}:${period}`;
        const cachedDrawdown = await RedisService.get(cacheKey);
        if (cachedDrawdown) {
            return res.status(200).json({
                status: 'success',
                data: cachedDrawdown,
                source: 'cache'
            });
        }

        const drawdown = await PortfolioService.getDrawdownAnalysis(userId, period);
        await RedisService.set(cacheKey, drawdown, CACHE_DURATIONS.RISK_SCORE);

        res.status(200).json({
            status: 'success',
            data: drawdown,
            source: 'calculation'
        });
    });

    static setupRiskAlerts = catchAsync(async (req, res) => {
        await sensitiveOpsLimiter.checkLimit(req);

        const userId = req.user._id;
        const alertData = sanitizeData(req.body);
        const validatedData = await validatePortfolioData.validateRiskAlerts(alertData);

        const alerts = await PortfolioService.setupRiskAlerts(userId, validatedData);
        await WebSocketService.emitRiskAlert(userId, alerts);

        res.status(200).json({
            status: 'success',
            data: alerts
        });
    });

    // Market Integration Methods
    static getMarketPrices = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { symbols } = req.query;

        if (!symbols) {
            throw new ApiError(400, 'Symbols are required');
        }

        const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase());
        const cacheKey = `portfolio:market:prices:${symbolArray.join('-')}`;

        const cachedPrices = await RedisService.get(cacheKey);
        if (cachedPrices) {
            return res.status(200).json({
                status: 'success',
                data: cachedPrices,
                source: 'cache'
            });
        }

        const prices = await PortfolioService.getMarketPrices(userId, symbolArray);
        await RedisService.set(cacheKey, prices, CACHE_DURATIONS.MARKET_DATA);

        res.status(200).json({
            status: 'success',
            data: prices,
            source: 'api'
        });
    });

    static getMarketTrends = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { timeframe = '24h' } = req.query;

        const validatedTimeframe = validateTimeframe(timeframe);
        const sanitizedTimeframe = sanitizeTimeframe(validatedTimeframe);

        const cacheKey = `portfolio:market:trends:${sanitizedTimeframe}`;
        const cachedTrends = await RedisService.get(cacheKey);
        if (cachedTrends) {
            return res.status(200).json({
                status: 'success',
                data: cachedTrends,
                source: 'cache'
            });
        }

        const trends = await PortfolioService.getMarketTrends(userId, sanitizedTimeframe);
        await RedisService.set(cacheKey, trends, CACHE_DURATIONS.MARKET_DATA);

        res.status(200).json({
            status: 'success',
            data: trends,
            source: 'api'
        });
    });

    static getVolumeAnalysis = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { period = '24h' } = req.query;

        if (!['24h', '7d', '30d'].includes(period)) {
            throw new ApiError(400, 'Invalid period');
        }

        const cacheKey = `portfolio:volume:${userId}:${period}`;
        const cachedVolume = await RedisService.get(cacheKey);
        if (cachedVolume) {
            return res.status(200).json({
                status: 'success',
                data: cachedVolume,
                source: 'cache'
            });
        }

        const volume = await PortfolioService.getVolumeAnalysis(userId, period);
        await RedisService.set(cacheKey, volume, CACHE_DURATIONS.MARKET_DATA);

        res.status(200).json({
            status: 'success',
            data: volume,
            source: 'calculation'
        });
    });

    static setupPriceAlerts = catchAsync(async (req, res) => {
        await sensitiveOpsLimiter.checkLimit(req);

        const userId = req.user._id;
        const alertData = sanitizeData(req.body);
        const validatedData = await validatePortfolioData.validatePriceAlerts(alertData);

        const alerts = await PortfolioService.setupPriceAlerts(userId, validatedData);
        await WebSocketService.emitPriceAlert(userId, alerts);

        res.status(200).json({
            status: 'success',
            data: alerts
        });
    });

    // Tax & Reporting Methods
    static getTaxSummary = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { year } = req.params;

        if (!year || isNaN(year) || year.length !== 4) {
            throw new ApiError(400, 'Invalid year format');
        }

        const cacheKey = `portfolio:tax:summary:${userId}:${year}`;
        const cachedSummary = await RedisService.get(cacheKey);
        if (cachedSummary) {
            return res.status(200).json({
                status: 'success',
                data: cachedSummary,
                source: 'cache'
            });
        }

        const summary = await PortfolioService.getTaxSummary(userId, year);
        await RedisService.set(cacheKey, summary, CACHE_DURATIONS.TAX_DATA);

        res.status(200).json({
            status: 'success',
            data: summary,
            source: 'calculation'
        });
    });

    static getTransactionHistory = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { startDate, endDate, page = 1, limit = 10 } = req.query;

        if (startDate && !Date.parse(startDate)) {
            throw new ApiError(400, 'Invalid start date format');
        }
        if (endDate && !Date.parse(endDate)) {
            throw new ApiError(400, 'Invalid end date format');
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        if (isNaN(pageNum) || pageNum < 1) {
            throw new ApiError(400, 'Invalid page number');
        }
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            throw new ApiError(400, 'Invalid limit (1-100)');
        }

        const cacheKey = `portfolio:transactions:${userId}:${startDate}:${endDate}:${pageNum}:${limitNum}`;
        const cachedHistory = await RedisService.get(cacheKey);
        if (cachedHistory) {
            return res.status(200).json({
                status: 'success',
                data: cachedHistory,
                source: 'cache'
            });
        }

        const history = await PortfolioService.getTransactionHistory(userId, {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page: pageNum,
            limit: limitNum
        });

        await RedisService.set(cacheKey, history, CACHE_DURATIONS.HISTORICAL_DATA);

        res.status(200).json({
            status: 'success',
            data: history,
            source: 'db'
        });
    });

    static getProfitLossStatement = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { year } = req.query;

        if (!year || isNaN(year) || year.length !== 4) {
            throw new ApiError(400, 'Invalid year format');
        }

        const cacheKey = `portfolio:pnl:statement:${userId}:${year}`;
        const cachedStatement = await RedisService.get(cacheKey);
        if (cachedStatement) {
            return res.status(200).json({
                status: 'success',
                data: cachedStatement,
                source: 'cache'
            });
        }

        const statement = await PortfolioService.getProfitLossStatement(userId, year);
        await RedisService.set(cacheKey, statement, CACHE_DURATIONS.TAX_DATA);

        res.status(200).json({
            status: 'success',
            data: statement,
            source: 'calculation'
        });
    });

    static getCostBasisReport = catchAsync(async (req, res) => {
        const userId = req.user._id;

        const cacheKey = `portfolio:costbasis:report:${userId}`;
        const cachedReport = await RedisService.get(cacheKey);
        if (cachedReport) {
            return res.status(200).json({
                status: 'success',
                data: cachedReport,
                source: 'cache'
            });
        }

        const report = await PortfolioService.getCostBasisReport(userId);
        await RedisService.set(cacheKey, report, CACHE_DURATIONS.TAX_DATA);

        res.status(200).json({
            status: 'success',
            data: report,
            source: 'calculation'
        });
    });

    static exportTaxReport = catchAsync(async (req, res) => {
        await sensitiveOpsLimiter.checkLimit(req);

        const userId = req.user._id;
        const { year, format = 'pdf' } = req.body;

        if (!year || isNaN(year) || year.length !== 4) {
            throw new ApiError(400, 'Invalid year format');
        }

        if (!['pdf', 'csv', 'xlsx'].includes(format.toLowerCase())) {
            throw new ApiError(400, 'Invalid export format. Supported formats: pdf, csv, xlsx');
        }

        const report = await PortfolioService.exportTaxReport(userId, year, format.toLowerCase());

        res.status(200).json({
            status: 'success',
            data: report
        });
    });
}