import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { TechnicalController } from '../controllers/technical.controller.js';
import { RateLimiter } from '../middleware/RateLimiter.middleware.js';

const router = express.Router();

// Original Technical Routes
router.get('/indicators/params', authenticate, TechnicalController.getIndicatorParameters);
router.get('/indicators/:symbol', authenticate, RateLimiter, TechnicalController.getTechnicalIndicators);
router.get('/arbitrage', authenticate, TechnicalController.getArbitrageOpportunities);
router.get('/arbitrage/history', authenticate, TechnicalController.getArbitrageHistory);

// Volume Analysis
router.get('/volume/:symbol', authenticate, TechnicalController.getVolumeAnalysis);
router.get('/volume/distribution/:symbol', authenticate, TechnicalController.getVolumeDistribution);
router.get('/volume/alerts/:symbol', authenticate, TechnicalController.getVolumeAlerts);

// Price Patterns
router.get('/patterns/:symbol', authenticate, TechnicalController.getPricePatterns);
router.get('/support-resistance/:symbol', authenticate, TechnicalController.getSupportResistance);
router.get('/breakouts/:symbol', authenticate, TechnicalController.getBreakoutLevels);

// Momentum Indicators
router.get('/momentum/:symbol', authenticate, TechnicalController.getMomentumIndicators);
router.get('/momentum/strength/:symbol', authenticate, TechnicalController.getTrendStrength);
router.get('/momentum/divergence/:symbol', authenticate, TechnicalController.getMomentumDivergence);

// Volatility Analysis
router.get('/volatility/:symbol', authenticate, TechnicalController.getVolatilityMetrics);
router.get('/volatility/bands/:symbol', authenticate, TechnicalController.getVolatilityBands);
router.get('/volatility/risk/:symbol', authenticate, TechnicalController.getRiskMetrics);

// Market Depth
router.get('/depth/:symbol', authenticate, TechnicalController.getMarketDepth);
router.get('/depth/liquidity/:symbol', authenticate, TechnicalController.getLiquidityMetrics);
router.get('/depth/orderflow/:symbol', authenticate, TechnicalController.getOrderFlowAnalysis);

export default router;