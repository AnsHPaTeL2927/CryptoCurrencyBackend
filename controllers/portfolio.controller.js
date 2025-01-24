// controllers/portfolio.controller.js
import PortfolioService from '../services/portfolio.service.js';
import WebSocketService from '../services/websocket/websocket.service.js';
import { RateLimiter } from '../middleware/rateLimiter.middleware.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { validatePortfolioData } from '../validations/portfolio.validation.js';
import { sanitizeData } from '../utils/sanitizer.js';

// Rate limiter for sensitive operations
const sensitiveOpsLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
});

export class PortfolioController {
    // Real-time Portfolio Value Updates
    static getPortfolioOverview = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const overview = await PortfolioService.getPortfolioOverview(userId);
        await WebSocketService.subscribeToPortfolioUpdates(userId);

        res.status(200).json({
            status: 'success',
            data: overview
        });
    });

    static getRealTimeValue = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const value = await PortfolioService.getRealTimeValue(userId);
        await WebSocketService.emitPortfolioValue(userId, value);

        res.status(200).json({
            status: 'success',
            data: value
        });
    });

    static getAssetPerformance = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { timeframe = '24h' } = req.query;
        const performance = await PortfolioService.getAssetPerformance(userId, timeframe);

        res.status(200).json({
            status: 'success',
            data: performance
        });
    });

    static getDailyChange = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const dailyChange = await PortfolioService.getDailyChange(userId);

        res.status(200).json({
            status: 'success',
            data: dailyChange
        });
    });

    // Portfolio Analytics
    static getROIAnalysis = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { period = 'all' } = req.query;
        const roi = await PortfolioService.getROIAnalysis(userId, period);

        res.status(200).json({
            status: 'success',
            data: roi
        });
    });

    static getHistoricalPerformance = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { timeframe = 'all', interval = 'daily' } = req.query;
        const history = await PortfolioService.getHistoricalPerformance(userId, timeframe, interval);

        res.status(200).json({
            status: 'success',
            data: history
        });
    });

    static getAssetAllocation = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const allocation = await PortfolioService.getAssetAllocation(userId);

        res.status(200).json({
            status: 'success',
            data: allocation
        });
    });

    static getProfitLossBreakdown = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { period = 'all' } = req.query;
        const pnl = await PortfolioService.getProfitLossBreakdown(userId, period);

        res.status(200).json({
            status: 'success',
            data: pnl
        });
    });

    static getCostBasisAnalysis = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const analysis = await PortfolioService.getCostBasisAnalysis(userId);

        res.status(200).json({
            status: 'success',
            data: analysis
        });
    });

    // Risk Management
    static getPortfolioRiskScore = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const riskScore = await PortfolioService.getPortfolioRiskScore(userId);

        res.status(200).json({
            status: 'success',
            data: riskScore
        });
    });

    static getRiskDistribution = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const distribution = await PortfolioService.getRiskDistribution(userId);

        res.status(200).json({
            status: 'success',
            data: distribution
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
        const drawdown = await PortfolioService.getDrawdownAnalysis(userId, period);

        res.status(200).json({
            status: 'success',
            data: drawdown
        });
    });

    static setupRiskAlerts = catchAsync(async (req, res) => {
        await sensitiveOpsLimiter.checkLimit(req);

        const userId = req.user._id;
        const alertData = sanitizeData(req.body);
        const validatedData = await validatePortfolioData.validateRiskAlerts(alertData);

        const alerts = await PortfolioService.setupRiskAlerts(userId, validatedData);

        res.status(200).json({
            status: 'success',
            data: alerts
        });
    });

    // Market Integration
    static getMarketPrices = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { symbols } = req.query;
        const prices = await PortfolioService.getMarketPrices(userId, symbols);

        res.status(200).json({
            status: 'success',
            data: prices
        });
    });

    static getMarketTrends = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { timeframe = '24h' } = req.query;
        const trends = await PortfolioService.getMarketTrends(userId, timeframe);

        res.status(200).json({
            status: 'success',
            data: trends
        });
    });

    static getVolumeAnalysis = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { period = '24h' } = req.query;
        const volume = await PortfolioService.getVolumeAnalysis(userId, period);

        res.status(200).json({
            status: 'success',
            data: volume
        });
    });

    static setupPriceAlerts = catchAsync(async (req, res) => {
        await sensitiveOpsLimiter.checkLimit(req);

        const userId = req.user._id;
        const alertData = sanitizeData(req.body);
        const validatedData = await validatePortfolioData.validatePriceAlerts(alertData);

        const alerts = await PortfolioService.setupPriceAlerts(userId, validatedData);

        res.status(200).json({
            status: 'success',
            data: alerts
        });
    });

    // Tax & Reporting
    static getTaxSummary = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { year } = req.params;
        const summary = await PortfolioService.getTaxSummary(userId, year);

        res.status(200).json({
            status: 'success',
            data: summary
        });
    });

    static getTransactionHistory = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { startDate, endDate, page = 1, limit = 10 } = req.query;
        const history = await PortfolioService.getTransactionHistory(userId, {
            startDate,
            endDate,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.status(200).json({
            status: 'success',
            data: history
        });
    });

    static getProfitLossStatement = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { year } = req.query;
        const statement = await PortfolioService.getProfitLossStatement(userId, year);

        res.status(200).json({
            status: 'success',
            data: statement
        });
    });

    static getCostBasisReport = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const report = await PortfolioService.getCostBasisReport(userId);

        res.status(200).json({
            status: 'success',
            data: report
        });
    });

    static exportTaxReport = catchAsync(async (req, res) => {
        await sensitiveOpsLimiter.checkLimit(req);

        const userId = req.user._id;
        const { year, format = 'pdf' } = req.body;
        const report = await PortfolioService.exportTaxReport(userId, year, format);

        res.status(200).json({
            status: 'success',
            data: report
        });
    });
}

export default PortfolioController;