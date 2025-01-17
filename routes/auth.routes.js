import express from 'express';
import { validate } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema } from '../validations/auth.validation.js';
import { register, login, googleAuth, googleCallback, verifyToken  } from '../controllers/auth.controller.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.get('/verify', authenticate, verifyToken);

export default router;