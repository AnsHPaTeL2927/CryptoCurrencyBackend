import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware.js';
import { RateLimiter } from './middleware/rateLimiter.middleware.js';
import authRoutes from './routes/auth.routes.js';
// import userRoutes from './routes/user.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
// import tradeRoutes from './routes/trade.routes.js';
import technicalRoutes from './routes/technical.routes.js'
// import marketRoutes from './routes/market.routes.js';
import externalRoutes from './routes/external.routes.js';

const app = express();

// Middleware
app.use(helmet());
app.use(
    cors({
        origin: 'http://localhost:5173', // Replace with the URL of your frontend
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
        ],
    })
);
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(RateLimiter);

// Routes
app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
app.use('/api/portfolio', portfolioRoutes);
// app.use('/api/trade', tradeRoutes);
app.use('/api/technical', technicalRoutes);
// app.use('/api/market', marketRoutes);
app.use('/api/external', externalRoutes);

// Error handling
app.use(errorHandler);

app.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
    });
});

export default app;