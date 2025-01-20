// routes/v1/market.routes.js
import express from 'express';
import { marketController } from '../../controllers/market.controller.js'; // Update path
import { authenticate } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Market Overview
router.get('/overview', authenticate, marketController.getMarketOverview);
// router.get('/global', authenticate, marketController.getGlobalData);

// Price Routes
router.get('/prices', authenticate, marketController.getCurrentPrices);
// router.get('/prices/:coinId', authenticate, marketController.getCoinPrice);
router.get('/prices/:coinId/history', authenticate, marketController.getPriceHistory);
// router.get('/prices/:coinId/range', authenticate, marketController.getPriceRange);

// Market Data
// router.get('/coins', authenticate, marketController.getCoins);
// router.get('/coins/:coinId', authenticate, marketController.getCoinDetails);
router.get('/trending', authenticate, marketController.getTrendingCoins);
// router.get('/categories', authenticate, marketController.getCategories);
// router.get('/exchanges', authenticate, marketController.getExchanges);

// Search
// router.get('/search', authenticate, marketController.searchCoins);

export default router;