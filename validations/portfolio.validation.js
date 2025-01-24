// validations/portfolio.validation.js
import { ApiError } from '../utils/ApiError.js';

export const validatePortfolioData = {
    // Validate Risk Alert Settings
    validateRiskAlerts: async (data) => {
        try {
            const { alertType, threshold, timeframe } = data;

            // Validate alert type
            if (!['PRICE', 'VOLUME', 'VOLATILITY', 'EXPOSURE'].includes(alertType)) {
                throw new ApiError('Invalid alert type', 400);
            }

            // Validate threshold
            if (typeof threshold !== 'number' || threshold <= 0) {
                throw new ApiError('Invalid threshold value', 400);
            }

            // Validate timeframe
            if (!['1h', '4h', '12h', '24h', '7d', '30d'].includes(timeframe)) {
                throw new ApiError('Invalid timeframe', 400);
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    // Validate Price Alerts
    validatePriceAlerts: async (data) => {
        try {
            const { symbol, price, condition, notificationType } = data;

            if (!symbol || typeof symbol !== 'string') {
                throw new ApiError('Invalid symbol', 400);
            }

            if (typeof price !== 'number' || price <= 0) {
                throw new ApiError('Invalid price', 400);
            }

            if (!['ABOVE', 'BELOW', 'EQUALS'].includes(condition)) {
                throw new ApiError('Invalid condition', 400);
            }

            if (!['EMAIL', 'SMS', 'PUSH'].includes(notificationType)) {
                throw new ApiError('Invalid notification type', 400);
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    // Validate Portfolio Deposit
    validateDeposit: async (data) => {
        try {
            const { amount, currency, method } = data;

            if (typeof amount !== 'number' || amount <= 0) {
                throw new ApiError('Invalid deposit amount', 400);
            }

            if (!currency || typeof currency !== 'string') {
                throw new ApiError('Invalid currency', 400);
            }

            if (!['BANK', 'CRYPTO', 'CARD'].includes(method)) {
                throw new ApiError('Invalid deposit method', 400);
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    // Validate Portfolio Withdrawal
    validateWithdrawal: async (data) => {
        try {
            const { amount, currency, address, method } = data;

            if (typeof amount !== 'number' || amount <= 0) {
                throw new ApiError('Invalid withdrawal amount', 400);
            }

            if (!currency || typeof currency !== 'string') {
                throw new ApiError('Invalid currency', 400);
            }

            if (!address || typeof address !== 'string') {
                throw new ApiError('Invalid withdrawal address', 400);
            }

            if (!['BANK', 'CRYPTO'].includes(method)) {
                throw new ApiError('Invalid withdrawal method', 400);
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    // Validate Portfolio Analysis Request
    validateAnalysisRequest: async (data) => {
        try {
            const { timeframe, metrics } = data;

            if (!['24h', '7d', '30d', '90d', '1y', 'all'].includes(timeframe)) {
                throw new ApiError('Invalid timeframe', 400);
            }

            if (metrics && !Array.isArray(metrics)) {
                throw new ApiError('Invalid metrics format', 400);
            }

            const validMetrics = ['roi', 'volatility', 'sharpe', 'drawdown'];
            if (metrics && !metrics.every(metric => validMetrics.includes(metric))) {
                throw new ApiError('Invalid metric type', 400);
            }

            return data;
        } catch (error) {
            throw error;
        }
    }
};