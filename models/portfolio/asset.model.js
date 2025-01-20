// models/portfolio/asset.model.js
import mongoose from 'mongoose';
import { encryptField, decryptField } from '../common/encryption.js';

const assetSchema = new mongoose.Schema({
  portfolioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: true,
    index: true
  },
  coinId: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    validate: {
      validator: (v) => v >= 0,
      message: 'Quantity cannot be negative'
    }
  },
  averagePrice: {
    type: Number,
    required: true
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  notes: {
    type: String,
    trim: true
  },
  sensitiveData: {
    type: String,
    select: false,
    set: encryptField,
    get: decryptField
  }
}, {
  timestamps: true
});

const Asset = mongoose.model('Asset', assetSchema);

export default Asset;