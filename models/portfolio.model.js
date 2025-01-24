import mongoose from 'mongoose';
import { encryptData, decryptData } from '../utils/encryption.js';
import { calculateRiskScore } from '../utils/risk-calculator.js';

const assetSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: Number.isFinite,
      message: 'Amount must be a valid number'
    }
  },
  costBasis: {
    type: Number,
    required: true,
    min: 0,
    set: encryptData,
    get: decryptData
  },
  currentPrice: {
    type: Number,
    required: true,
    min: 0
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  profitLoss: {
    type: Number,
    default: 0
  },
  profitLossPercentage: {
    type: Number,
    default: 0
  },
  allocation: {
    type: Number,
    min: 0,
    max: 100
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  totalValue: {
    type: Number,
    required: true,
    default: 0,
    set: encryptData,
    get: decryptData
  },
  assets: [assetSchema],
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
    default: 'MEDIUM'
  },
  settings: {
    alertThresholds: {
      priceChange: {
        type: Number,
        default: 5,
        min: 0,
        max: 100
      },
      riskLevel: {
        type: Number,
        default: 70,
        min: 0,
        max: 100
      },
      exposure: {
        type: Number,
        default: 20,
        min: 0,
        max: 100
      }
    },
    autoRebalance: {
      enabled: {
        type: Boolean,
        default: false
      },
      threshold: {
        type: Number,
        default: 5,
        min: 1,
        max: 20
      }
    }
  },
  lastCalculated: {
    type: Date,
    default: Date.now
  },
  lastSync: {
    type: Date,
    required: true,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  toJSON: { 
    getters: true,
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret._id;
      return ret;
    }
  }
});

// Indexes for performance
portfolioSchema.index({ userId: 1, 'assets.symbol': 1 });
portfolioSchema.index({ lastUpdated: -1 });
portfolioSchema.index({ riskScore: 1 });

// Pre-save middleware
portfolioSchema.pre('save', async function(next) {
  if (this.isModified('assets')) {
    // Recalculate portfolio risk score
    this.riskScore = await calculateRiskScore(this.assets);
    
    // Update risk level
    this.riskLevel = this.getRiskLevel();
    
    // Update total value
    this.totalValue = this.assets.reduce((sum, asset) => sum + asset.value, 0);
    
    // Update asset allocations
    this.assets.forEach(asset => {
      asset.allocation = (asset.value / this.totalValue) * 100;
    });
  }
  next();
});

// Methods
portfolioSchema.methods = {
  getRiskLevel() {
    if (this.riskScore < 25) return 'LOW';
    if (this.riskScore < 50) return 'MEDIUM';
    if (this.riskScore < 75) return 'HIGH';
    return 'VERY_HIGH';
  },

  async validateAssetLimits() {
    const totalAllocation = this.assets.reduce((sum, asset) => sum + asset.allocation, 0);
    if (totalAllocation > 100) {
      throw new Error('Total asset allocation cannot exceed 100%');
    }
  },

  async checkExposure() {
    const exposedAssets = this.assets.filter(asset => 
      asset.allocation > this.settings.alertThresholds.exposure
    );
    return exposedAssets;
  }
};

// Statics
portfolioSchema.statics = {
  async findByUserIdWithSecurity(userId) {
    const portfolio = await this.findOne({ userId }).select('-settings.alertThresholds');
    if (!portfolio) return null;
    return portfolio;
  },

  async updateAssetPrice(userId, symbol, newPrice) {
    const portfolio = await this.findOne({ userId });
    if (!portfolio) throw new Error('Portfolio not found');

    const asset = portfolio.assets.find(a => a.symbol === symbol);
    if (!asset) throw new Error('Asset not found');

    asset.currentPrice = newPrice;
    asset.value = asset.amount * newPrice;
    asset.profitLoss = asset.value - (asset.amount * asset.costBasis);
    asset.profitLossPercentage = (asset.profitLoss / (asset.amount * asset.costBasis)) * 100;
    asset.lastUpdated = new Date();

    await portfolio.save();
    return portfolio;
  }
};

// Virtual fields
portfolioSchema.virtual('totalProfitLoss').get(function() {
  return this.assets.reduce((sum, asset) => sum + asset.profitLoss, 0);
});

portfolioSchema.virtual('totalProfitLossPercentage').get(function() {
  const totalCost = this.assets.reduce((sum, asset) => sum + (asset.amount * asset.costBasis), 0);
  return (this.totalProfitLoss / totalCost) * 100;
});

export const Portfolio = mongoose.model('Portfolio', portfolioSchema);