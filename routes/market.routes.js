import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { MarketController } from '../controllers/market.controller.js';

const router = express.Router();

// Market Data
router.get('/prices/:symbol', MarketController.getPriceBySymbol);
router.get('/trends/analysis', MarketController.getTrendAnalysis);
router.get('/volume/analysis', MarketController.getVolumeAnalysis);
router.get('/market-cap/ranking', MarketController.getMarketCapRanking);

// Market Alertp
router.post('/alerts/price', authenticate, MarketController.createPriceAlert);
router.post('/alerts/volume', authenticate, MarketController.createVolumeAlert);
router.get('/alerts', authenticate, MarketController.getUserAlerts);
router.delete('/alerts/:alertId', authenticate, MarketController.deleteAlert);

export default router;