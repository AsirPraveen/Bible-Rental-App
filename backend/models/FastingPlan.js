const mongoose = require('mongoose');

const fastingPlanSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserInfo',
    required: true
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    required: true
  },
  notifyInterval: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Broken'],
    default: 'Active'
  },
  notes: {
    type: String,
    trim: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('FastingPlan', fastingPlanSchema);
