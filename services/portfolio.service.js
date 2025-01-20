// services/market/portfolio.service.js
import { marketService } from './market.service.js';
import { redisClient } from '../config/redis.js';
import { ApiError } from '../utils/ApiError.js';
import { Portfolio } from '../models/portfolio/portfolio.model.js';
import { Transaction } from '../models/portfolio/transaction.model.js';

class PortfolioService {
  // Get Portfolio Summary
  async getPortfolioSummary(userId) {
    try {
      const cacheKey = `portfolio:summary:${userId}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const portfolio = await Portfolio.findOne({ userId });
      if (!portfolio) {
        return {
          totalValue: 0,
          totalCost: 0,
          profitLoss: 0,
          assets: []
        };
      }

      const assets = await this.getPortfolioAssets(userId);
      const summary = await this.calculatePortfolioMetrics(assets);

      await redisClient.setex(cacheKey, 60, JSON.stringify(summary)); // Cache for 1 minute
      return summary;
    } catch (error) {
      throw new ApiError(500, 'Error fetching portfolio summary: ' + error.message);
    }
  }

  // Get Portfolio Performance
  async getPortfolioPerformance(userId, timeframe = '30d') {
    try {
      const cacheKey = `portfolio:performance:${userId}:${timeframe}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const assets = await this.getPortfolioAssets(userId);
      const performance = await this.calculateHistoricalPerformance(assets, timeframe);

      const cacheDuration = timeframe === '24h' ? 300 : 3600; // Cache for 5 mins if 24h, 1 hour otherwise
      await redisClient.setex(cacheKey, cacheDuration, JSON.stringify(performance));

      return performance;
    } catch (error) {
      throw new ApiError(500, 'Error fetching portfolio performance: ' + error.message);
    }
  }

  // Add Transaction
  async addTransaction(userId, transactionData) {
    try {
      const { coinId, type, quantity, price } = transactionData;

      const transaction = await Transaction.create({
        userId,
        coinId,
        type,
        quantity,
        price,
        timestamp: Date.now()
      });

      await this.updatePortfolioBalance(userId, coinId);
      await this.clearPortfolioCache(userId);

      return transaction;
    } catch (error) {
      throw new ApiError(500, 'Error adding transaction: ' + error.message);
    }
  }

  // Helper Methods
  async getPortfolioAssets(userId) {
    const portfolio = await Portfolio.findOne({ userId }).populate('assets');
    return portfolio?.assets || [];
  }

  async calculatePortfolioMetrics(assets) {
    if (assets.length === 0) {
      return {
        totalValue: 0,
        totalCost: 0,
        profitLoss: 0,
        assets: []
      };
    }

    const coinIds = assets.map(asset => asset.coinId);
    const prices = await marketService.getCurrentPrices(coinIds);

    let totalValue = 0;
    let totalCost = 0;

    const processedAssets = assets.map(asset => {
      const currentPrice = prices[asset.coinId]?.usd || 0;
      const value = asset.quantity * currentPrice;
      const cost = asset.quantity * asset.averagePrice;

      totalValue += value;
      totalCost += cost;

      return {
        ...asset.toObject(),
        currentPrice,
        value,
        profitLoss: value - cost,
        profitLossPercentage: ((value - cost) / cost) * 100
      };
    });

    return {
      totalValue,
      totalCost,
      profitLoss: totalValue - totalCost,
      profitLossPercentage: ((totalValue - totalCost) / totalCost) * 100,
      assets: processedAssets
    };
  }

  async calculateHistoricalPerformance(assets, timeframe) {
    const performances = await Promise.all(
      assets.map(async (asset) => {
        const history = await marketService.getPriceHistory(asset.coinId, timeframe);
        return this.calculateAssetPerformance(asset, history);
      })
    );

    return this.aggregatePerformances(performances);
  }

  async clearPortfolioCache(userId) {
    const keys = [
      `portfolio:summary:${userId}`,
      `portfolio:performance:${userId}:*`
    ];

    for (const key of keys) {
      await redisClient.del(key);
    }
  }
}

export const portfolioService = new PortfolioService();