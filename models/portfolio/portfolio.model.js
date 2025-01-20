// models/portfolio/portfolio.model.js
import mongoose from 'mongoose';
import { encryptField, decryptField } from '../common/encryption.js';
import { AuditModel } from '../common/audit.model.js';

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  assets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  }],
  totalValue: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  privacyLevel: {
    type: String,
    enum: ['private', 'public', 'friends'],
    default: 'private'
  },
  settings: {
    notifications: {
      priceAlerts: { type: Boolean, default: true },
      portfolioUpdates: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true }
    },
    currency: {
      type: String,
      default: 'USD'
    },
    timeZone: {
      type: String,
      default: 'UTC'
    }
  },
  security: {
    lastAccessed: Date,
    accessHistory: [{
      timestamp: Date,
      ipAddress: String,
      userAgent: String,
      location: String
    }],
    twoFactorRequired: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
portfolioSchema.index({ userId: 1, isActive: 1 });
portfolioSchema.index({ 'security.lastAccessed': 1 });

// Virtuals
portfolioSchema.virtual('profitLoss').get(function() {
  return this.totalValue - this.totalCost;
});

portfolioSchema.virtual('profitLossPercentage').get(function() {
  if (this.totalCost === 0) return 0;
  return ((this.totalValue - this.totalCost) / this.totalCost) * 100;
});

// Methods
portfolioSchema.methods.recordAccess = async function(accessData) {
  this.security.lastAccessed = new Date();
  this.security.accessHistory.push({
    timestamp: new Date(),
    ipAddress: accessData.ipAddress,
    userAgent: accessData.userAgent,
    location: accessData.location
  });
  return this.save();
};

portfolioSchema.methods.updateTotalValue = async function(newValue) {
  const oldValue = this.totalValue;
  this.totalValue = newValue;
  
  await AuditModel.create({
    entityType: 'Portfolio',
    entityId: this._id,
    action: 'UPDATE_VALUE',
    oldValue,
    newValue,
    userId: this.userId
  });

  return this.save();
};

// Middleware
portfolioSchema.pre('save', async function(next) {
  if (this.isModified('totalValue') || this.isModified('totalCost')) {
    // Validate numbers
    if (this.totalValue < 0 || this.totalCost < 0) {
      throw new Error('Portfolio values cannot be negative');
    }
  }
  next();
});

portfolioSchema.pre('remove', async function(next) {
  // Clean up related documents
  await Promise.all([
    mongoose.model('Asset').deleteMany({ portfolioId: this._id }),
    mongoose.model('Transaction').deleteMany({ portfolioId: this._id }),
    mongoose.model('Alert').deleteMany({ portfolioId: this._id })
  ]);
  next();
});

// Static methods
portfolioSchema.statics.getPortfolioWithAssets = async function(userId) {
  return this.findOne({ userId, isActive: true })
    .populate({
      path: 'assets',
      select: '-sensitiveData'
    });
};

portfolioSchema.statics.getPortfolioMetrics = async function(userId) {
  const portfolio = await this.findOne({ userId, isActive: true });
  if (!portfolio) return null;

  return {
    totalValue: portfolio.totalValue,
    totalCost: portfolio.totalCost,
    profitLoss: portfolio.profitLoss,
    profitLossPercentage: portfolio.profitLossPercentage,
    assetCount: portfolio.assets.length
  };
};

export const Portfolio = mongoose.model('Portfolio', portfolioSchema);