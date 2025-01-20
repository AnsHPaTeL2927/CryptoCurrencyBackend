// routes/index.js
import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import v1Routes from './v1/index.js';

const router = express.Router();

// Auth & User routes (non-versioned)
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// V1 API routes
router.use('/v1', v1Routes);

export default router;