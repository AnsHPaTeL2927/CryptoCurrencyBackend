// models/common/audit.model.js
import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: true,
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

export const AuditModel = mongoose.model('Audit', auditSchema);