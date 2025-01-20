// models/portfolio/transaction.model.js
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  portfolioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: true,
    index: true
  },
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  type: {
    type: String,
    enum: ['buy', 'sell', 'transfer_in', 'transfer_out'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  fee: {
    amount: Number,
    currency: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  hash: {
    type: String,
    sparse: true
  }
}, {
  timestamps: true
});

export const Transaction = mongoose.model('Transaction', transactionSchema);