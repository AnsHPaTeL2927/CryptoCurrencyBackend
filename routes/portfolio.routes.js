import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { PortfolioController } from '../controllers/portfolio.controller.js';

const router = express.Router();

// Real-time Portfolio Value Updates
router.get('/overview', authenticate, PortfolioController.getPortfolioOverview);
router.get('/real-time-value', authenticate, PortfolioController.getRealTimeValue);
router.get('/asset-performance', authenticate, PortfolioController.getAssetPerformance);
router.get('/daily-change', authenticate, PortfolioController.getDailyChange);

// Portfolio Analytics
router.get('/analytics/roi', authenticate, PortfolioController.getROIAnalysis);
router.get('/analytics/historical', authenticate, PortfolioController.getHistoricalPerformance);
router.get('/analytics/allocation', authenticate, PortfolioController.getAssetAllocation);
router.get('/analytics/profit-loss', authenticate, PortfolioController.getProfitLossBreakdown);
router.get('/analytics/cost-basis', authenticate, PortfolioController.getCostBasisAnalysis);

// Risk Management
router.get('/risk/score', authenticate, PortfolioController.getPortfolioRiskScore);
router.get('/risk/distribution', authenticate, PortfolioController.getRiskDistribution);
router.get('/risk/exposure-alerts', authenticate, PortfolioController.getExposureAlerts);
router.get('/risk/drawdown', authenticate, PortfolioController.getDrawdownAnalysis);
router.post('/risk/alerts/setup', authenticate, PortfolioController.setupRiskAlerts);

// Market Integration
router.get('/market/prices', authenticate, PortfolioController.getMarketPrices);
router.get('/market/trends', authenticate, PortfolioController.getMarketTrends);
router.get('/market/volume', authenticate, PortfolioController.getVolumeAnalysis);
router.post('/market/alerts', authenticate, PortfolioController.setupPriceAlerts);

// Tax & Reporting
router.get('/tax/summary/:year', authenticate, PortfolioController.getTaxSummary);
router.get('/tax/transactions', authenticate, PortfolioController.getTransactionHistory);
router.get('/tax/profit-loss-statement', authenticate, PortfolioController.getProfitLossStatement);
router.get('/tax/cost-basis-report', authenticate, PortfolioController.getCostBasisReport);
router.post('/tax/export', authenticate, PortfolioController.exportTaxReport);

export default router;