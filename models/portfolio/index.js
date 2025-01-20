// models/portfolio/index.js

// Import models
import Portfolio from './portfolio.model.js';
import Asset from './asset.model.js';
import Transaction from './transaction.model.js';
import Alert from './alert.model.js';

// Import validation schemas and types
import { 
    PortfolioValidation, 
    AssetValidation, 
    TransactionValidation, 
    AlertValidation 
} from './validations/index.js';

// Import portfolio-related constants
import { 
    PORTFOLIO_PRIVACY_LEVELS,
    TRANSACTION_TYPES,
    ALERT_TYPES,
    SUPPORTED_CURRENCIES 
} from './constants.js';

// Import portfolio-related utilities
import { 
    calculatePortfolioMetrics,
    validateTransaction,
    validateAssetBalance 
} from './utils.js';

// Export models
export const Models = {
    Portfolio,
    Asset,
    Transaction,
    Alert
};

// Export validations
export const Validations = {
    PortfolioValidation,
    AssetValidation,
    TransactionValidation,
    AlertValidation
};

// Export constants
export const Constants = {
    PORTFOLIO_PRIVACY_LEVELS,
    TRANSACTION_TYPES,
    ALERT_TYPES,
    SUPPORTED_CURRENCIES
};

// Export utilities
export const Utils = {
    calculatePortfolioMetrics,
    validateTransaction,
    validateAssetBalance
};

// Export type definitions
export const Types = {
    Portfolio: Portfolio,
    Asset: Asset,
    Transaction: Transaction,
    Alert: Alert
};

// Export default object with all modules
export default {
    Models,
    Validations,
    Constants,
    Utils,
    Types
};

// Export individual models for direct import
export {
    Portfolio,
    Asset,
    Transaction,
    Alert
};

// Export helper functions for model manipulation
export const createPortfolio = async (data) => {
    return await Portfolio.create(data);
};

export const findPortfolioById = async (id) => {
    return await Portfolio.findById(id).populate('assets');
};

export const updatePortfolio = async (id, data) => {
    return await Portfolio.findByIdAndUpdate(id, data, { new: true });
};

export const deletePortfolio = async (id) => {
    return await Portfolio.findByIdAndDelete(id);
};

// Asset helpers
export const createAsset = async (data) => {
    return await Asset.create(data);
};

export const findAssetById = async (id) => {
    return await Asset.findById(id);
};

// Transaction helpers
export const createTransaction = async (data) => {
    const transaction = await Transaction.create(data);
    await validateAssetBalance(transaction.assetId);
    return transaction;
};

export const findTransactionById = async (id) => {
    return await Transaction.findById(id);
};

// Alert helpers
export const createAlert = async (data) => {
    return await Alert.create(data);
};

export const findAlertById = async (id) => {
    return await Alert.findById(id);
};

// Utility function to check if a portfolio exists
export const portfolioExists = async (id) => {
    return await Portfolio.exists({ _id: id });
};

// Utility function to get portfolio summary
export const getPortfolioSummary = async (portfolioId) => {
    const portfolio = await Portfolio.findById(portfolioId)
        .populate('assets')
        .lean();
    
    if (!portfolio) {
        return null;
    }

    return calculatePortfolioMetrics(portfolio);
};

// Export database functions for aggregate operations
export const PortfolioOperations = {
    createPortfolio,
    findPortfolioById,
    updatePortfolio,
    deletePortfolio,
    createAsset,
    findAssetById,
    createTransaction,
    findTransactionById,
    createAlert,
    findAlertById,
    portfolioExists,
    getPortfolioSummary
};