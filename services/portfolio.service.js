// services/portfolio.service.js
import { Portfolio } from '../models/portfolio.model.js';
import { PortfolioHistory } from '../models/portfolio-history.model.js';
import { ExternalAPIService } from './external.service.js';
import { RedisService } from './redis.service.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import portfolioHelpers from '../utils/helpers/portfolio.helper.js';

export class PortfolioService {
    // Real-time Portfolio Value Updates
    static async getPortfolioOverview(userId) {
        try {
            // Try to get from cache first
            const cachedData = await RedisService.get(`portfolio:${userId}:overview`);
            if (cachedData) return cachedData;

            const portfolio = await Portfolio.findOne({ userId })
                .populate('assets.symbol')
                .lean();

            if (!portfolio) {
                throw new ApiError('Portfolio not found', 404);
            }

            // Get current prices for all assets
            const symbols = portfolio.assets.map(asset => asset.symbol);
            const currentPrices = await ExternalAPIService.getCurrentPrices(symbols);

            // Calculate current values
            const overview = portfolioHelpers.calculatePortfolioOverview(portfolio, currentPrices);

            // Cache the result
            await RedisService.set(`portfolio:${userId}:overview`, overview, 60); // Cache for 1 minute

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
            const currentPrices = await ExternalAPIService.getCurrentPrices(symbols);

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

    // Helper Methods
    // private static getTimeframeStartDate(timeframe) {
    //     const now = new Date();
    //     switch (timeframe) {
    //         case '24h':
    //             return new Date(now - 24 * 60 * 60 * 1000);
    //         case '7d':
    //             return new Date(now - 7 * 24 * 60 * 60 * 1000);
    //         case '30d':
    //             return new Date(now - 30 * 24 * 60 * 60 * 1000);
    //         case '90d':
    //             return new Date(now - 90 * 24 * 60 * 60 * 1000);
    //         case '1y':
    //             return new Date(now - 365 * 24 * 60 * 60 * 1000);
    //         default:
    //             return new Date(0); // all time
    //     }
    // }

    // private static getIntervalGrouping(interval) {
    //     switch (interval) {
    //         case 'hourly':
    //             return { $hour: '$timestamp' };
    //         case 'daily':
    //             return { $dayOfMonth: '$timestamp' };
    //         case 'weekly':
    //             return { $week: '$timestamp' };
    //         case 'monthly':
    //             return { $month: '$timestamp' };
    //         default:
    //             return { $dayOfMonth: '$timestamp' };
    //     }
    // }

    // private static calculatePortfolioOverview(portfolio, currentPrices) {
    //     let totalValue = 0;
    //     let totalPnL = 0;

    //     const assets = portfolio.assets.map(asset => {
    //         const currentPrice = currentPrices[asset.symbol];
    //         const currentValue = asset.amount * currentPrice;
    //         const pnl = currentValue - (asset.amount * asset.costBasis);

    //         totalValue += currentValue;
    //         totalPnL += pnl;

    //         return {
    //             ...asset,
    //             currentPrice,
    //             currentValue,
    //             pnl,
    //             pnlPercentage: (pnl / (asset.amount * asset.costBasis)) * 100
    //         };
    //     });

    //     return {
    //         totalValue,
    //         totalPnL,
    //         pnlPercentage: (totalPnL / totalValue) * 100,
    //         assets,
    //         lastUpdated: new Date()
    //     };
    // }

    // private static async calculateRiskScore(portfolio) {
    //     // Implement complex risk calculation logic here
    //     // Consider factors like:
    //     // - Asset diversity
    //     // - Market volatility
    //     // - Asset correlation
    //     // - Historical performance
    // }

    // private static calculateRiskDistribution(assets) {
    //     // Implement risk distribution calculation
    //     // Consider factors like:
    //     // - Asset allocation
    //     // - Asset volatility
    //     // - Market cap distribution
    //     // - Sector distribution
    // }
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

    // Private Helper Methods
    // private static calculateDrawdown(history) {
    //     let peak = -Infinity;
    //     let maxDrawdown = 0;
    //     let drawdownStart = null;
    //     let drawdownEnd = null;

    //     history.forEach((entry, index) => {
    //         if (entry.totalValue > peak) {
    //             peak = entry.totalValue;
    //         }

    //         const drawdown = ((peak - entry.totalValue) / peak) * 100;
    //         if (drawdown > maxDrawdown) {
    //             maxDrawdown = drawdown;
    //             drawdownEnd = entry.timestamp;

    //             // Find drawdown start
    //             for (let i = index; i >= 0; i--) {
    //                 if (history[i].totalValue === peak) {
    //                     drawdownStart = history[i].timestamp;
    //                     break;
    //                 }
    //             }
    //         }
    //     });

    //     return {
    //         maxDrawdown,
    //         drawdownStart,
    //         drawdownEnd,
    //         currentDrawdown: ((peak - history[history.length - 1].totalValue) / peak) * 100
    //     };
    // }

    // private static generateTaxSummary(trades, year) {
    //     let totalProfits = 0;
    //     let totalLosses = 0;
    //     const assetSummary = {};

    //     trades.forEach(trade => {
    //         const profit = trade.profitLoss;
    //         if (profit > 0) {
    //             totalProfits += profit;
    //         } else {
    //             totalLosses += Math.abs(profit);
    //         }

    //         // Track per-asset performance
    //         if (!assetSummary[trade.symbol]) {
    //             assetSummary[trade.symbol] = {
    //                 profits: 0,
    //                 losses: 0,
    //                 trades: 0
    //             };
    //         }
    //         assetSummary[trade.symbol].trades++;
    //         if (profit > 0) {
    //             assetSummary[trade.symbol].profits += profit;
    //         } else {
    //             assetSummary[trade.symbol].losses += Math.abs(profit);
    //         }
    //     });

    //     return {
    //         year,
    //         totalProfits,
    //         totalLosses,
    //         netGain: totalProfits - totalLosses,
    //         assetSummary,
    //         taxableAmount: totalProfits,
    //         estimatedTaxLiability: totalProfits * 0.3, // Example tax rate
    //         trades: trades.length
    //     };
    // }

    // private static async generateTaxReport(summary, transactions, format) {
    //     // Implementation would depend on the required format (PDF, CSV, etc.)
    //     // This is a placeholder that would need to be implemented based on requirements
    //     switch (format.toLowerCase()) {
    //         case 'pdf':
    //             return this.generatePDFReport(summary, transactions);
    //         case 'csv':
    //             return this.generateCSVReport(summary, transactions);
    //         default:
    //             throw new ApiError('Unsupported report format', 400);
    //     }
    // }
}

export default PortfolioService;