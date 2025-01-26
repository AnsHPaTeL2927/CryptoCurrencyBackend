import { TradeService } from '../services/trade.service.js';
import WebSocketService from '../services/websocket/websocket.service.js';
import { RateLimiter } from '../middleware/rateLimiter.middleware.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { validateTradeData } from '../validations/trade.validation.js';
import { sanitizeData } from '../utils/sanitizer.js';

// Rate limiter for trading operations
const tradeLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50 // limit each IP to 50 trade operations per 15 minutes
});

export class TradeController {
    // Trade Operations
    static executeTrade = catchAsync(async (req, res) => {
        await tradeLimiter.checkLimit(req);

        const userId = req.user._id;
        const tradeData = sanitizeData(req.body);

        // Validate trade data
        const validatedData = await validateTradeData(tradeData);

        // Execute trade
        const trade = await TradeService.executeTrade(userId, validatedData);

        // Emit real-time update
        await WebSocketService.emitTradeUpdate(userId, {
            type: 'TRADE_EXECUTED',
            data: trade
        });

        res.status(200).json({
            status: 'success',
            data: trade
        });
    });

    static closeTrade = catchAsync(async (req, res) => {
        await tradeLimiter.checkLimit(req);

        const userId = req.user._id;
        const { tradeId } = req.params;

        const trade = await TradeService.closeTrade(userId, tradeId);
        await WebSocketService.emitTradeUpdate(userId, {
            type: 'TRADE_CLOSED',
            data: trade
        });

        res.status(200).json({
            status: 'success',
            data: trade
        });
    });

    static updateTrade = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { tradeId } = req.params;
        const updateData = sanitizeData(req.body);

        const trade = await TradeService.updateTrade(userId, tradeId, updateData);
        await WebSocketService.emitTradeUpdate(userId, {
            type: 'TRADE_UPDATED',
            data: trade
        });

        res.status(200).json({
            status: 'success',
            data: trade
        });
    });

    // Trade History & Analysis
    static getTradeHistory = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { page = 1, limit = 10, startDate, endDate } = req.query;

        const history = await TradeService.getTradeHistory(userId, {
            page: parseInt(page),
            limit: parseInt(limit),
            startDate,
            endDate
        });

        res.status(200).json({
            status: 'success',
            data: history
        });
    });

    static getTradeDetails = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { tradeId } = req.params;

        const trade = await TradeService.getTradeDetails(userId, tradeId);
        if (!trade) {
            throw new ApiError('Trade not found', 404);
        }

        res.status(200).json({
            status: 'success',
            data: trade
        });
    });

    static getTradePerformance = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { timeframe = 'all' } = req.query;

        const performance = await TradeService.getTradePerformance(userId, timeframe);

        res.status(200).json({
            status: 'success',
            data: performance
        });
    });

    static getTradeStatistics = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { period = 'all' } = req.query;

        const stats = await TradeService.getTradeStatistics(userId, period);

        res.status(200).json({
            status: 'success',
            data: stats
        });
    });

    // Open Positions
    static getOpenPositions = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const positions = await TradeService.getOpenPositions(userId);

        res.status(200).json({
            status: 'success',
            data: positions
        });
    });

    static getClosedPositions = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { page = 1, limit = 10 } = req.query;

        const positions = await TradeService.getClosedPositions(userId, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.status(200).json({
            status: 'success',
            data: positions
        });
    });

    static getPositionDetails = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { positionId } = req.params;

        const position = await TradeService.getPositionDetails(userId, positionId);
        if (!position) {
            throw new ApiError('Position not found', 404);
        }

        res.status(200).json({
            status: 'success',
            data: position
        });
    });

    // Trade Settings
    static setStopLoss = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { tradeId } = req.params;
        const { price } = sanitizeData(req.body);

        const trade = await TradeService.setStopLoss(userId, tradeId, price);
        await WebSocketService.emitTradeUpdate(userId, {
            type: 'STOP_LOSS_UPDATED',
            data: trade
        });

        res.status(200).json({
            status: 'success',
            data: trade
        });
    });

    static setTakeProfit = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { tradeId } = req.params;
        const { price } = sanitizeData(req.body);

        const trade = await TradeService.setTakeProfit(userId, tradeId, price);
        await WebSocketService.emitTradeUpdate(userId, {
            type: 'TAKE_PROFIT_UPDATED',
            data: trade
        });

        res.status(200).json({
            status: 'success',
            data: trade
        });
    });

    static setTrailingStop = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { tradeId } = req.params;
        const { distance } = sanitizeData(req.body);

        const trade = await TradeService.setTrailingStop(userId, tradeId, distance);
        await WebSocketService.emitTradeUpdate(userId, {
            type: 'TRAILING_STOP_UPDATED',
            data: trade
        });

        res.status(200).json({
            status: 'success',
            data: trade
        });
    });

    // Batch Operations
    static executeBatchTrades = catchAsync(async (req, res) => {
        await tradeLimiter.checkLimit(req);

        const userId = req.user._id;
        const trades = sanitizeData(req.body.trades);

        const results = await TradeService.executeBatchTrades(userId, trades);
        await WebSocketService.emitTradeUpdate(userId, {
            type: 'BATCH_TRADES_EXECUTED',
            data: results
        });

        res.status(200).json({
            status: 'success',
            data: results
        });
    });

    static closeBatchTrades = catchAsync(async (req, res) => {
        await tradeLimiter.checkLimit(req);

        const userId = req.user._id;
        const { tradeIds } = sanitizeData(req.body);

        const results = await TradeService.closeBatchTrades(userId, tradeIds);
        await WebSocketService.emitTradeUpdate(userId, {
            type: 'BATCH_TRADES_CLOSED',
            data: results
        });

        res.status(200).json({
            status: 'success',
            data: results
        });
    });

    // Reports
    static getDailyReport = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { date } = req.query;

        const report = await TradeService.getDailyReport(userId, date);

        res.status(200).json({
            status: 'success',
            data: report
        });
    });

    static getMonthlyReport = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { month, year } = req.query;

        const report = await TradeService.getMonthlyReport(userId, { month, year });

        res.status(200).json({
            status: 'success',
            data: report
        });
    });

    static getPnLReport = catchAsync(async (req, res) => {
        const userId = req.user._id;
        const { startDate, endDate } = req.query;

        const report = await TradeService.getPnLReport(userId, { startDate, endDate });

        res.status(200).json({
            status: 'success',
            data: report
        });
    });
}

export default TradeController;