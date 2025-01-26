import mongoose from 'mongoose';
import EncryptionService from '../utils/encryption.js';

const historyAssetSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  price: {
    type: Number,
    required: true,
    set: EncryptionService.encryptData,
    get: EncryptionService.decryptData
  },
  amount: {
    type: Number,
    required: true,
    set: EncryptionService.encryptData,
    get: EncryptionService.decryptData
  },
  value: {
    type: Number,
    required: true,
    set: EncryptionService.encryptData,
    get: EncryptionService.decryptData
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const portfolioHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  totalValue: {
    type: Number,
    required: true,
    set: EncryptionService.encryptData,
    get: EncryptionService.decryptData
  },
  dailyPnL: {
    type: Number,
    set: EncryptionService.encryptData,
    get: EncryptionService.decryptData
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  assets: [historyAssetSchema],
  dataHash: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  toJSON: { 
    getters: true,
    transform: (doc, ret) => {
      delete ret.__v;
      delete ret.dataHash;
      return ret;
    }
  }
});

// Indexes
portfolioHistorySchema.index({ userId: 1, timestamp: -1 });
portfolioHistorySchema.index({ 'assets.symbol': 1, timestamp: -1 });

// Pre-save middleware
portfolioHistorySchema.pre('save', async function(next) {
  // Generate hash of critical data for integrity verification
  const criticalData = {
    totalValue: this.totalValue,
    assets: this.assets,
    timestamp: this.timestamp
  };
  this.dataHash = await generateDataHash(criticalData);
  next();
});

// Methods
portfolioHistorySchema.methods = {
  async verifyIntegrity() {
    const criticalData = {
      totalValue: this.totalValue,
      assets: this.assets,
      timestamp: this.timestamp
    };
    const currentHash = await generateDataHash(criticalData);
    return currentHash === this.dataHash;
  }
};

// Statics
portfolioHistorySchema.statics = {
  async getHistoricalData(userId, startDate, endDate, interval = 'day') {
    const aggregation = [
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $eq: [interval, 'hour'] }, then: {
                  $dateToString: { format: '%Y-%m-%d-%H', date: '$timestamp' }
                }},
                { case: { $eq: [interval, 'day'] }, then: {
                  $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
                }},
                { case: { $eq: [interval, 'week'] }, then: {
                  $dateToString: { format: '%Y-%U', date: '$timestamp' }
                }},
                { case: { $eq: [interval, 'month'] }, then: {
                  $dateToString: { format: '%Y-%m', date: '$timestamp' }
                }}
              ],
              default: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
            }
          },
          totalValue: { $avg: '$totalValue' },
          highValue: { $max: '$totalValue' },
          lowValue: { $min: '$totalValue' },
          riskScore: { $avg: '$riskScore' }
        }
      },
      { $sort: { '_id': 1 } }
    ];

    return this.aggregate(aggregation);
  }
};

export const PortfolioHistory = mongoose.model('PortfolioHistory', portfolioHistorySchema);