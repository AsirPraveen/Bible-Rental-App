const mongoose = require('mongoose');

const prayerRequestSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserInfo',
    required: true
  },
  requestText: {
    type: String,
    required: true,
    trim: true,
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  visibility: {
    type: String,
    enum: ['org', 'public'],
    default: 'org',
  },
  prayedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserInfo'
  }]
}, { timestamps: true });

module.exports = mongoose.model('PrayerRequest', prayerRequestSchema);
