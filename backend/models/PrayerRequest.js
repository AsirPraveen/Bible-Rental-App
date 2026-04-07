const mongoose = require('mongoose');

const prayerRequestSchema = new mongoose.Schema({
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
  prayedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserInfo'
  }]
}, { timestamps: true });

module.exports = mongoose.model('PrayerRequest', prayerRequestSchema);
