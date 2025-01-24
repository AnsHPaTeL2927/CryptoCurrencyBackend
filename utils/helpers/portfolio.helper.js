// utils/helpers/portfolio.helper.js
import logger from '../logger.js';
import { ApiError } from '../ApiError.js';

// Time and Date Helpers
const timeHelpers = {
    getTimeframeStartDate(timeframe) {
        try {
            const now = new Date();
            switch (timeframe) {
                case '24h': return new Date(now - 24 * 60 * 60 * 1000);
                case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
                case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
                case '90d': return new Date(now - 90 * 24 * 60 * 60 * 1000);
                case '1y': return new Date(now - 365 * 24 * 60 * 60 * 1000);
                default: return new Date(0); // all time
            }
        } catch (error) {
            logger.error('Error in getTimeframeStartDate:', error);
            throw error;
        }
    },

    getIntervalGrouping(interval) {
        try {
            switch (interval) {
                case 'hourly': return { $hour: '$timestamp' };
                case 'daily': return { $dayOfMonth: '$timestamp' };
                case 'weekly': return { $week: '$timestamp' };
                case 'monthly': return { $month: '$timestamp' };
                default: return { $dayOfMonth: '$timestamp' };
            }
        } catch (error) {
            logger.error('Error in getIntervalGrouping:', error);
            throw error;
        }
    }
};

// Calculation Helpers
const calculationHelpers = {
    calculatePortfolioOverview(portfolio, currentPrices) {
        try {
            let totalValue = 0;
            let totalPnL = 0;

            const assets = portfolio.assets.map(asset => {
                const currentPrice = currentPrices[asset.symbol];
                const currentValue = asset.amount * currentPrice;
                const pnl = currentValue - (asset.amount * asset.costBasis);
                
                totalValue += currentValue;
                totalPnL += pnl;

                return {
                    ...asset,
                    currentPrice,
                    currentValue,
                    pnl,
                    pnlPercentage: (pnl / (asset.amount * asset.costBasis)) * 100
                };
            });

            return {
                totalValue,
                totalPnL,
                pnlPercentage: (totalPnL / totalValue) * 100,
                assets,
                lastUpdated: new Date()
            };
        } catch (error) {
            logger.error('Error in calculatePortfolioOverview:', error);
            throw error;
        }
    },

    calculateDrawdown(history) {
        try {
            let peak = -Infinity;
            let maxDrawdown = 0;
            let drawdownStart = null;
            let drawdownEnd = null;

            history.forEach((entry, index) => {
                if (entry.totalValue > peak) {
                    peak = entry.totalValue;
                }

                const drawdown = ((peak - entry.totalValue) / peak) * 100;
                if (drawdown > maxDrawdown) {
                    maxDrawdown = drawdown;
                    drawdownEnd = entry.timestamp;
                    
                    // Find drawdown start
                    for (let i = index; i >= 0; i--) {
                        if (history[i].totalValue === peak) {
                            drawdownStart = history[i].timestamp;
                            break;
                        }
                    }
                }
            });

            return {
                maxDrawdown,
                drawdownStart,
                drawdownEnd,
                currentDrawdown: ((peak - history[history.length - 1].totalValue) / peak) * 100
            };
        } catch (error) {
            logger.error('Error in calculateDrawdown:', error);
            throw error;
        }
    }
};

// Risk Analysis Helpers
const riskHelpers = {
    async calculateRiskScore(portfolio) {
        try {
            const diversificationScore = this.calculateDiversificationScore(portfolio.assets);
            const volatilityScore = await this.calculateVolatilityScore(portfolio.assets);
            const correlationScore = await this.calculateCorrelationScore(portfolio.assets);

            const score = (
                diversificationScore * 0.4 +
                volatilityScore * 0.3 +
                correlationScore * 0.3
            );

            return {
                score,
                level: this.getRiskLevel(score),
                components: {
                    diversification: diversificationScore,
                    volatility: volatilityScore,
                    correlation: correlationScore
                }
            };
        } catch (error) {
            logger.error('Error in calculateRiskScore:', error);
            throw error;
        }
    },

    calculateRiskDistribution(assets) {
        try {
            const distribution = {
                byValue: {},
                byRiskLevel: {},
                byVolatility: {}
            };

            const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);

            assets.forEach(asset => {
                distribution.byValue[asset.symbol] = (asset.value / totalValue) * 100;
                distribution.byRiskLevel[asset.symbol] = this.getAssetRiskLevel(asset);
                distribution.byVolatility[asset.symbol] = this.getAssetVolatility(asset);
            });

            return distribution;
        } catch (error) {
            logger.error('Error in calculateRiskDistribution:', error);
            throw error;
        }
    }
};

// Tax and Report Helpers
const reportHelpers = {
    generateTaxSummary(trades, year) {
        try {
            let totalProfits = 0;
            let totalLosses = 0;
            const assetSummary = {};

            trades.forEach(trade => {
                const profit = trade.profitLoss;
                
                // Update totals
                if (profit > 0) {
                    totalProfits += profit;
                } else {
                    totalLosses += Math.abs(profit);
                }

                // Update asset summary
                if (!assetSummary[trade.symbol]) {
                    assetSummary[trade.symbol] = {
                        profits: 0,
                        losses: 0,
                        trades: 0
                    };
                }
                
                assetSummary[trade.symbol].trades++;
                if (profit > 0) {
                    assetSummary[trade.symbol].profits += profit;
                } else {
                    assetSummary[trade.symbol].losses += Math.abs(profit);
                }
            });

            return {
                year,
                totalProfits,
                totalLosses,
                netGain: totalProfits - totalLosses,
                assetSummary,
                taxableAmount: totalProfits,
                estimatedTaxLiability: totalProfits * 0.3,
                trades: trades.length
            };
        } catch (error) {
            logger.error('Error in generateTaxSummary:', error);
            throw error;
        }
    },

    async generateTaxReport(summary, transactions, format) {
        try {
            switch (format.toLowerCase()) {
                case 'pdf':
                    return this.generatePDFReport(summary, transactions);
                case 'csv':
                    return this.generateCSVReport(summary, transactions);
                default:
                    throw new ApiError('Unsupported report format', 400);
            }
        } catch (error) {
            logger.error('Error in generateTaxReport:', error);
            throw error;
        }
    }
};

export const portfolioHelpers = {
    ...timeHelpers,
    ...calculationHelpers,
    ...riskHelpers,
    ...reportHelpers
};

export default portfolioHelpers;