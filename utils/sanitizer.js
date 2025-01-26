import validator from 'validator';
import { ApiError } from './ApiError.js';

/**
 * Sanitize strings, numbers, objects and arrays
 * @param {any} data - Data to sanitize
 * @returns {any} Sanitized data
 */
export const sanitizeData = (data) => {
    if (data === null || data === undefined) {
        return data;
    }

    // Handle different data types
    if (typeof data === 'string') {
        return sanitizeString(data);
    }
    if (typeof data === 'number') {
        return sanitizeNumber(data);
    }
    if (Array.isArray(data)) {
        return sanitizeArray(data);
    }
    if (typeof data === 'object') {
        return sanitizeObject(data);
    }

    return data;
};

/**
 * Sanitize string values
 */
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;

    // Trim whitespace
    str = str.trim();

    // Escape HTML entities
    str = validator.escape(str);

    // Remove common SQL injection patterns
    str = str.replace(/'/g, "''");
    str = str.replace(/;/g, "");

    // Remove potential script tags and other harmful HTML
    str = str.replace(/<[^>]*>/g, '');

    return str;
};

/**
 * Sanitize number values
 */
const sanitizeNumber = (num) => {
    if (typeof num !== 'number') {
        if (typeof num === 'string' && validator.isNumeric(num)) {
            return parseFloat(num);
        }
        throw new ApiError('Invalid number format', 400);
    }

    // Check for NaN and Infinity
    if (!Number.isFinite(num)) {
        throw new ApiError('Invalid number value', 400);
    }

    return num;
};

/**
 * Sanitize arrays recursively
 */
const sanitizeArray = (arr) => {
    return arr.map(item => sanitizeData(item));
};

/**
 * Sanitize objects recursively
 */
const sanitizeObject = (obj) => {
    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
        // Sanitize key to prevent prototype pollution
        const sanitizedKey = sanitizeString(key);

        // Skip if key is __proto__ or constructor
        if (sanitizedKey === '__proto__' || sanitizedKey === 'constructor') {
            continue;
        }

        sanitized[sanitizedKey] = sanitizeData(value);
    }

    return sanitized;
};

/**
 * Special sanitizers for specific data types
 */
export const specialSanitizers = {
    // Portfolio-specific sanitizers
    portfolioData: (data) => {
        if (!data) throw new ApiError('No portfolio data provided', 400);

        return {
            ...sanitizeData(data),
            amount: data.amount ? Math.abs(sanitizeNumber(data.amount)) : undefined,
            price: data.price ? Math.abs(sanitizeNumber(data.price)) : undefined
        };
    },

    // Trade-specific sanitizers
    tradeData: (data) => {
        if (!data) throw new ApiError('No trade data provided', 400);

        return {
            ...sanitizeData(data),
            quantity: data.quantity ? Math.abs(sanitizeNumber(data.quantity)) : undefined,
            price: data.price ? Math.abs(sanitizeNumber(data.price)) : undefined,
            stopLoss: data.stopLoss ? Math.abs(sanitizeNumber(data.stopLoss)) : undefined,
            takeProfit: data.takeProfit ? Math.abs(sanitizeNumber(data.takeProfit)) : undefined
        };
    },

    // Market data sanitizers
    marketData: (data) => {
        if (!data) throw new ApiError('No market data provided', 400);

        return {
            ...sanitizeData(data),
            symbol: data.symbol ? data.symbol.toUpperCase() : undefined,
            interval: data.interval ? sanitizeString(data.interval).toLowerCase() : undefined
        };
    },

    // Date sanitizer
    dateString: (date) => {
        if (!date) return date;

        if (!validator.isISO8601(date)) {
            throw new ApiError('Invalid date format', 400);
        }

        return date;
    },

    // Pagination sanitizer
    paginationData: (data) => {
        return {
            page: Math.max(1, parseInt(data.page) || 1),
            limit: Math.min(100, Math.max(1, parseInt(data.limit) || 10))
        };
    }
};

export const sanitizeTimeframe = (timeframe) => {
    if (!timeframe) return '24h';
 
    const validTimeframes = ['24h', '7d', '30d', '90d', '1y', 'all'];
    const sanitized = sanitizeString(timeframe).toLowerCase();
 
    if (!validTimeframes.includes(sanitized)) {
        throw new ApiError(400, 'Invalid timeframe format');
    }
 
    return sanitized;
 };

export default sanitizeData;