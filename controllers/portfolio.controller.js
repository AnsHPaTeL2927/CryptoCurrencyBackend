// controllers/market/portfolio.controller.js
import {catchAsync} from '../utils/catchAsync.js';
import { portfolioService } from '../services/portfolio.service.js';
import { ApiError } from '../utils/ApiError.js';

export const portfolioController = {
    // Portfolio Summary
    getSummary: catchAsync(async (req, res) => {
        const userId = req.user.id;
        const summary = await portfolioService.getPortfolioSummary(userId);
        res.json(summary);
    }),

    // Portfolio Performance
    getPerformance: catchAsync(async (req, res) => {
        const userId = req.user.id;
        const { timeframe = '30d' } = req.query;
        const performance = await portfolioService.getPortfolioPerformance(userId, timeframe);
        res.json(performance);
    }),

    // // Asset Distribution
    // getDistribution: catchAsync(async (req, res) => {
    //     const userId = req.user.id;
    //     const distribution = await portfolioService.getAssetDistribution(userId);
    //     res.json(distribution);
    // }),

    // Assets Management
    // getAssets: catchAsync(async (req, res) => {
    //     const userId = req.user.id;
    //     const assets = await portfolioService.getUserAssets(userId);
    //     res.json(assets);
    // }),

    // addAsset: catchAsync(async (req, res) => {
    //     const userId = req.user.id;
    //     const assetData = req.body;

    //     if (!assetData.coinId || !assetData.quantity) {
    //         throw new ApiError(400, 'Coin ID and quantity are required');
    //     }

    //     const asset = await portfolioService.addAsset(userId, assetData);
    //     res.status(201).json(asset);
    // }),

    // updateAsset: catchAsync(async (req, res) => {
    //     const userId = req.user.id;
    //     const { assetId } = req.params;
    //     const updateData = req.body;

    //     const updated = await portfolioService.updateAsset(userId, assetId, updateData);
    //     res.json(updated);
    // }),

    // // Transactions
    // getTransactions: catchAsync(async (req, res) => {
    //     const userId = req.user.id;
    //     const { page = 1, limit = 10, type } = req.query;

    //     const transactions = await portfolioService.getTransactions(
    //         userId,
    //         parseInt(page),
    //         parseInt(limit),
    //         type
    //     );
    //     res.json(transactions);
    // }),

    addTransaction: catchAsync(async (req, res) => {
        const userId = req.user.id;
        const transactionData = req.body;

        if (!transactionData.type || !transactionData.coinId || !transactionData.quantity) {
            throw new ApiError(400, 'Transaction type, coin ID, and quantity are required');
        }

        const transaction = await portfolioService.addTransaction(userId, transactionData);
        res.status(201).json(transaction);
    }),

    // // Alerts
    // getAlerts: catchAsync(async (req, res) => {
    //     const userId = req.user.id;
    //     const alerts = await portfolioService.getAlerts(userId);
    //     res.json(alerts);
    // }),

    // createAlert: catchAsync(async (req, res) => {
    //     const userId = req.user.id;
    //     const alertData = req.body;

    //     if (!alertData.coinId || !alertData.targetPrice || !alertData.condition) {
    //         throw new ApiError(400, 'Coin ID, target price, and condition are required');
    //     }

    //     const alert = await portfolioService.createAlert(userId, alertData);
    //     res.status(201).json(alert);
    // }),

    // updateAlert: catchAsync(async (req, res) => {
    //     const userId = req.user.id;
    //     const { alertId } = req.params;
    //     const updateData = req.body;

    //     const updated = await portfolioService.updateAlert(userId, alertId, updateData);
    //     res.json(updated);
    // }),

    // deleteAlert: catchAsync(async (req, res) => {
    //     const userId = req.user.id;
    //     const { alertId } = req.params;

    //     await portfolioService.deleteAlert(userId, alertId);
    //     res.status(204).send();
    // })
};