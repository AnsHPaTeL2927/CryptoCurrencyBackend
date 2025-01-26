import { Portfolio } from '../models/portfolio.model.js';
import { PortfolioHistory } from '../models/portfolio-history.model.js';
import { CryptoCompareService } from './third-party/cryptocompare.service.js';
import { CoinCapService } from './third-party/coincap.service.js';
import { CoinMarketCapService } from './third-party/coinmarketcap.service.js';
import RedisService from './redis/redis.service.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import portfolioHelpers from '../utils/helpers/portfolio.helper.js';

const PRICE_DATA_WEIGHTS = {
    cryptocompare: 0.4,
    coincap: 0.3,
    coinmarketcap: 0.3
};

export class PortfolioService {
    // Real-time Portfolio Value Updates
    static async getPortfolioOverview(userId) {
        try {
            const cachedData = await RedisService.get(`portfolio:${userId}:overview`);
            if (cachedData) return cachedData;

            const portfolio = await Portfolio.findOne({ userId })
                .populate('assets.symbol')
                .lean();

            if (!portfolio) {
                throw new ApiError('Portfolio not found', 404);
            }

            const symbols = portfolio.assets.map(asset => asset.symbol);

            // Get prices from multiple sources
            const [cryptoComparePrices, coinCapPrices, cmcPrices] = await Promise.all([
                CryptoCompareService.getCurrentPrice(symbols),
                CoinCapService.getAssetPrices(symbols),
                CoinMarketCapService.getLatestQuotes(symbols)
            ]);

            // Calculate weighted average prices
            const currentPrices = this.calculateWeightedPrices(
                cryptoComparePrices,
                coinCapPrices,
                cmcPrices
            );

            const overview = portfolioHelpers.calculatePortfolioOverview(portfolio, currentPrices);
            await RedisService.set(`portfolio:${userId}:overview`, overview, 60);

            return overview;
        } catch (error) {
            logger.error('Error in getPortfolioOverview:', error);
            throw error;
        }
    }

    static async getRealTimeValue(userId) {
        try {
            const portfolio = await Portfolio.findOne({ userId });
            if (!portfolio) {
                throw new ApiError('Portfolio not found', 404);
            }

            const symbols = portfolio.assets.map(asset => asset.symbol);

            // Get real-time prices
            const [cryptoPrices, coinCapPrices] = await Promise.all([
                CryptoCompareService.getRealTimePrices(symbols),
                CoinCapService.getRealTimePrices(symbols)
            ]);

            const currentPrices = this.calculateWeightedPrices(cryptoPrices, coinCapPrices);

            const totalValue = portfolio.assets.reduce((sum, asset) => {
                const currentPrice = currentPrices[asset.symbol] || 0;
                return sum + (asset.amount * currentPrice);
            }, 0);

            return {
                totalValue,
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('Error in getRealTimeValue:', error);
            throw error;
        }
    }

    static async getAssetPerformance(userId, timeframe) {
        try {
            const portfolio = await Portfolio.findOne({ userId });
            if (!portfolio) {
                throw new ApiError('Portfolio not found', 404);
            }

            const historicalData = await PortfolioHistory.getHistoricalData(
                userId,
                portfolioHelpers.getTimeframeStartDate(timeframe),
                new Date()
            );

            return this.calculateAssetPerformance(portfolio.assets, historicalData);
        } catch (error) {
            logger.error('Error in getAssetPerformance:', error);
            throw error;
        }
    }

    // Portfolio Analytics Methods
    static async getROIAnalysis(userId, period) {
        try {
            const portfolio = await Portfolio.findOne({ userId });
            const historicalData = await PortfolioHistory.getHistoricalData(
                userId,
                portfolioHelpers.getTimeframeStartDate(period),
                new Date()
            );

            return this.calculateROI(portfolio, historicalData);
        } catch (error) {
            logger.error('Error in getROIAnalysis:', error);
            throw error;
        }
    }

    static async getHistoricalPerformance(userId, timeframe, interval) {
        try {
            const startDate = portfolioHelpers.getTimeframeStartDate(timeframe);
            const historicalData = await PortfolioHistory.aggregate([
                {
                    $match: {
                        userId: userId,
                        timestamp: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: portfolioHelpers.getIntervalGrouping(interval),
                        value: { $avg: '$totalValue' },
                        high: { $max: '$totalValue' },
                        low: { $min: '$totalValue' }
                    }
                },
                { $sort: { '_id': 1 } }
            ]);

            return this.processHistoricalData(historicalData);
        } catch (error) {
            logger.error('Error in getHistoricalPerformance:', error);
            throw error;
        }
    }

    // Risk Management Methods
    static async getPortfolioRiskScore(userId) {
        try {
            const portfolio = await Portfolio.findOne({ userId });
            if (!portfolio) {
                throw new ApiError('Portfolio not found', 404);
            }

            const riskScore = await portfolioHelpers.calculateRiskScore(portfolio);

            // Update portfolio risk score
            portfolio.riskScore = riskScore.score;
            portfolio.riskLevel = riskScore.level;
            await portfolio.save();

            return riskScore;
        } catch (error) {
            logger.error('Error in getPortfolioRiskScore:', error);
            throw error;
        }
    }

    static async getRiskDistribution(userId) {
        try {
            const portfolio = await Portfolio.findOne({ userId });
            return portfolioHelpers.calculateRiskDistribution(portfolio.assets);
        } catch (error) {
            logger.error('Error in getRiskDistribution:', error);
            throw error;
        }
    }

    static async getAssetAllocation(userId) {
        try {
            const portfolio = await Portfolio.findOne({ userId });
            if (!portfolio) {
                throw new ApiError('Portfolio not found', 404);
            }

            const totalValue = portfolio.assets.reduce((sum, asset) => sum + asset.value, 0);

            const allocation = portfolio.assets.map(asset => ({
                symbol: asset.symbol,
                percentage: (asset.value / totalValue) * 100,
                value: asset.value,
                amount: asset.amount,
                currentPrice: asset.currentPrice
            }));

            return {
                allocation,
                totalValue,
                lastUpdated: new Date()
            };
        } catch (error) {
            logger.error('Error in getAssetAllocation:', error);
            throw error;
        }
    }

    static async getProfitLossBreakdown(userId, period) {
        try {
            const startDate = portfolioHelpers.getTimeframeStartDate(period);
            const trades = await PortfolioHistory.find({
                userId,
                timestamp: { $gte: startDate }
            }).sort({ timestamp: 1 });

            const breakdown = this.calculateProfitLossBreakdown(trades);

            return {
                ...breakdown,
                period,
                startDate,
                endDate: new Date()
            };
        } catch (error) {
            logger.error('Error in getProfitLossBreakdown:', error);
            throw error;
        }
    }

    static async getCostBasisAnalysis(userId) {
        try {
            const portfolio = await Portfolio.findOne({ userId });
            if (!portfolio) {
                throw new ApiError('Portfolio not found', 404);
            }

            const analysis = portfolio.assets.map(asset => ({
                symbol: asset.symbol,
                costBasis: asset.costBasis,
                averagePrice: asset.costBasis / asset.amount,
                totalCost: asset.costBasis * asset.amount,
                currentValue: asset.currentPrice * asset.amount,
                unrealizedPnL: (asset.currentPrice * asset.amount) - (asset.costBasis * asset.amount)
            }));

            return {
                analysis,
                lastUpdated: new Date()
            };
        } catch (error) {
            logger.error('Error in getCostBasisAnalysis:', error);
            throw error;
        }
    }

    // Risk Management Methods
    static async getExposureAlerts(userId) {
        try {
            const portfolio = await Portfolio.findOne({ userId });
            if (!portfolio) {
                throw new ApiError('Portfolio not found', 404);
            }

            const alerts = [];
            const totalValue = portfolio.assets.reduce((sum, asset) => sum + asset.value, 0);

            portfolio.assets.forEach(asset => {
                const exposure = (asset.value / totalValue) * 100;
                if (exposure > portfolio.settings.alertThresholds.exposure) {
                    alerts.push({
                        type: 'HIGH_EXPOSURE',
                        symbol: asset.symbol,
                        exposure,
                        threshold: portfolio.settings.alertThresholds.exposure,
                        value: asset.value
                    });
                }
            });

            return alerts;
        } catch (error) {
            logger.error('Error in getExposureAlerts:', error);
            throw error;
        }
    }

    static async getDrawdownAnalysis(userId, period) {
        try {
            const startDate = portfolioHelpers.getTimeframeStartDate(period);
            const history = await PortfolioHistory.find({
                userId,
                timestamp: { $gte: startDate }
            }).sort({ timestamp: 1 });

            return portfolioHelpers.calculateDrawdown(history);
        } catch (error) {
            logger.error('Error in getDrawdownAnalysis:', error);
            throw error;
        }
    }

    static async setupRiskAlerts(userId, alertData) {
        try {
            const portfolio = await Portfolio.findOne({ userId });
            if (!portfolio) {
                throw new ApiError('Portfolio not found', 404);
            }

            portfolio.settings.alertThresholds = {
                ...portfolio.settings.alertThresholds,
                ...alertData
            };

            await portfolio.save();
            return portfolio.settings.alertThresholds;
        } catch (error) {
            logger.error('Error in setupRiskAlerts:', error);
            throw error;
        }
    }

    // Tax & Reporting Methods
    static async getTaxSummary(userId, year) {
        try {
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31);

            const trades = await PortfolioHistory.find({
                userId,
                timestamp: {
                    $gte: startDate,
                    $lte: endDate
                }
            });

            return portfolioHelpers.generateTaxSummary(trades, year);
        } catch (error) {
            logger.error('Error in getTaxSummary:', error);
            throw error;
        }
    }

    static async getTransactionHistory(userId, options) {
        try {
            const { startDate, endDate, page, limit } = options;
            const query = { userId };

            if (startDate && endDate) {
                query.timestamp = { $gte: startDate, $lte: endDate };
            }

            const transactions = await PortfolioHistory.find(query)
                .sort({ timestamp: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            const total = await PortfolioHistory.countDocuments(query);

            return {
                transactions,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error in getTransactionHistory:', error);
            throw error;
        }
    }

    static async exportTaxReport(userId, year, format) {
        try {
            const summary = await this.getTaxSummary(userId, year);
            const transactions = await this.getTransactionHistory(userId, {
                startDate: new Date(year, 0, 1),
                endDate: new Date(year, 11, 31),
                page: 1,
                limit: 1000
            });

            return portfolioHelpers.generateTaxReport(summary, transactions.transactions, format);
        } catch (error) {
            logger.error('Error in exportTaxReport:', error);
            throw error;
        }
    }
}

export default PortfolioService;