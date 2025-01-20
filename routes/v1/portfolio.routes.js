// routes/v1/portfolio.routes.js
import express from 'express';
import { portfolioController } from '../../controllers/portfolio.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Portfolio Overview
router.get('/summary', authenticate, portfolioController.getSummary);
router.get('/performance', authenticate, portfolioController.getPerformance);
// router.get('/distribution', authenticate, portfolioController.getDistribution);
// router.get('/analytics', authenticate, portfolioController.getAnalytics);

// Assets Management
// router.get('/assets', authenticate, portfolioController.getAssets);
// router.post('/assets', authenticate, portfolioController.addAsset);
// router.get('/assets/:assetId', authenticate, portfolioController.getAssetDetails);
// router.put('/assets/:assetId', authenticate, portfolioController.updateAsset);
// router.delete('/assets/:assetId', authenticate, portfolioController.deleteAsset);

// Transactions
// router.get('/transactions', authenticate, portfolioController.getTransactions);
router.post('/transactions', authenticate, portfolioController.addTransaction);
// router.get('/transactions/:id', authenticate, portfolioController.getTransactionDetails);
// router.delete('/transactions/:id', authenticate, portfolioController.deleteTransaction);

// Alerts
// router.get('/alerts', authenticate, portfolioController.getAlerts);
// router.post('/alerts', authenticate, portfolioController.createAlert);
// router.put('/alerts/:alertId', authenticate, portfolioController.updateAlert);
// router.delete('/alerts/:alertId', authenticate, portfolioController.deleteAlert);

export default router;