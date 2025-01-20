// app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware.js';
import { rateLimiter } from './middleware/rateLimiter.middleware.js';
import { redisClient } from './config/redis.js';
import http from 'http';
// Routes
import authRoutes from './routes/auth.routes.js';
// import userRoutes from './routes/user.routes.js';
import v1Routes from './routes/v1/index.js';

// WebSocket setup
import { setupWebSocket } from './websocket/websocket.js';


const app = express();
const server = http.createServer(app);

// Initialize Redis
const initializeRedis = async () => {
    try {
        await redisClient.connect();
        console.log('Redis connection established');
    } catch (error) {
        console.error('Redis connection failed:', error);
        process.exit(1);
    }
};

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
app.use(rateLimiter);

// Health Check with Redis status
app.get('/health', async (req, res) => {
    const redisStatus = redisClient.isReady ? 'connected' : 'disconnected';
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'crypto-portfolio-api',
        redis: redisStatus
    });
});

// API Routes
app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
app.use('/api/v1', v1Routes);

// Global Error Handler
app.use(errorHandler);

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Resource not found'
    });
});

// Start server with Redis initialization
const startServer = async () => {
    try {
        const PORT = process.env.PORT || 5001;  // Changed from 5000 to 3000

        // Initialize WebSocket
        setupWebSocket(server);

        // Start server
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.log(`Port ${PORT} is in use, trying ${PORT + 1}`);
                server.listen(PORT + 1);
            } else {
                console.error('Server error:', error);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};


startServer();

export default app;