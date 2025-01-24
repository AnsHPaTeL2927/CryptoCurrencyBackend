// validations/trade.validation.js
import { ApiError } from '../utils/ApiError.js';

export const validateTradeData = async (data) => {
    try {
        const {
            symbol,
            type,
            side,
            amount,
            price,
            leverage,
            stopLoss,
            takeProfit,
            timeInForce
        } = data;

        // Validate symbol
        if (!symbol || typeof symbol !== 'string') {
            throw new ApiError('Invalid trading symbol', 400);
        }

        // Validate trade type
        if (!['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'].includes(type)) {
            throw new ApiError('Invalid trade type', 400);
        }

        // Validate trade side
        if (!['BUY', 'SELL'].includes(side)) {
            throw new ApiError('Invalid trade side', 400);
        }

        // Validate amount
        if (typeof amount !== 'number' || amount <= 0) {
            throw new ApiError('Invalid trade amount', 400);
        }

        // Validate price for limit orders
        if (type !== 'MARKET' && (typeof price !== 'number' || price <= 0)) {
            throw new ApiError('Invalid price for limit order', 400);
        }

        // Validate leverage if provided
        if (leverage !== undefined) {
            if (typeof leverage !== 'number' || leverage < 1 || leverage > 100) {
                throw new ApiError('Invalid leverage value', 400);
            }
        }

        // Validate stop loss if provided
        if (stopLoss !== undefined) {
            if (typeof stopLoss !== 'number' || stopLoss <= 0) {
                throw new ApiError('Invalid stop loss value', 400);
            }
        }

        // Validate take profit if provided
        if (takeProfit !== undefined) {
            if (typeof takeProfit !== 'number' || takeProfit <= 0) {
                throw new ApiError('Invalid take profit value', 400);
            }
        }

        // Validate time in force
        if (timeInForce && !['GTC', 'IOC', 'FOK'].includes(timeInForce)) {
            throw new ApiError('Invalid time in force value', 400);
        }

        // Additional trade validations
        validateTradeRisk(data);
        validateTradeSize(data);
        validateTradeLimits(data);

        return data;
    } catch (error) {
        throw error;
    }
};

// Validate trade risk parameters
const validateTradeRisk = (data) => {
    const { amount, stopLoss, takeProfit, price } = data;

    if (stopLoss && takeProfit) {
        const riskRewardRatio = Math.abs((takeProfit - price) / (price - stopLoss));
        if (riskRewardRatio < 1) {
            throw new ApiError('Risk/Reward ratio must be at least 1:1', 400);
        }
    }
};

// Validate trade size against account balance
const validateTradeSize = (data) => {
    const { amount, leverage = 1 } = data;
    const maxPositionSize = amount * leverage;

    // Add your position size validation logic here
    if (maxPositionSize > 1000000) { // Example limit
        throw new ApiError('Position size exceeds maximum allowed', 400);
    }
};

// Validate trade against account limits
const validateTradeLimits = (data) => {
    const { leverage } = data;

    // Add your trade limits validation logic here
    if (leverage > 100) {
        throw new ApiError('Leverage exceeds maximum allowed', 400);
    }
};

// Validate batch trades
export const validateBatchTrades = async (trades) => {
    if (!Array.isArray(trades)) {
        throw new ApiError('Invalid batch trades format', 400);
    }

    if (trades.length > 10) { // Example limit
        throw new ApiError('Batch trades exceed maximum allowed', 400);
    }

    // Validate each trade in the batch
    const validatedTrades = await Promise.all(
        trades.map(trade => validateTradeData(trade))
    );

    return validatedTrades;
};

// Validate trade update data
export const validateTradeUpdate = async (data) => {
    try {
        const { stopLoss, takeProfit, trailingStop } = data;

        // At least one parameter must be provided
        if (!stopLoss && !takeProfit && !trailingStop) {
            throw new ApiError('No valid update parameters provided', 400);
        }

        // Validate stop loss if provided
        if (stopLoss !== undefined) {
            if (typeof stopLoss !== 'number' || stopLoss <= 0) {
                throw new ApiError('Invalid stop loss value', 400);
            }
        }

        // Validate take profit if provided
        if (takeProfit !== undefined) {
            if (typeof takeProfit !== 'number' || takeProfit <= 0) {
                throw new ApiError('Invalid take profit value', 400);
            }
        }

        // Validate trailing stop if provided
        if (trailingStop !== undefined) {
            if (typeof trailingStop !== 'number' || trailingStop <= 0) {
                throw new ApiError('Invalid trailing stop value', 400);
            }
        }

        return data;
    } catch (error) {
        throw error;
    }
};