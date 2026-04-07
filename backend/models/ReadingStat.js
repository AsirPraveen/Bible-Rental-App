const mongoose = require('mongoose');

const readingStatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // One stats document per user tracking their total lifetime stats
  },
  totalChaptersRead: {
    type: Number,
    default: 0
  },
  activePlans: {
    type: Number,
    default: 0
  },
  planProgress: [{
    planId: { type: String, required: true },
    currentDay: { type: Number, default: 1 },
    completedToday: { type: Boolean, default: false },
    lastStatusUpdate: { type: String } // Format: YYYY-MM-DD
  }],
  lastSynced: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const ReadingStat = mongoose.model('ReadingStat', readingStatSchema);
module.exports = ReadingStat;
