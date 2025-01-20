// routes/v1/index.js
import express from 'express';
import marketRoutes from './market.routes.js';
import portfolioRoutes from './portfolio.routes.js';

const router = express.Router();

// Market routes
router.use('/market', marketRoutes);

// Portfolio routes
router.use('/portfolio', portfolioRoutes);

export default router;