const mongoose = require('mongoose');

const historicalLocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  periodStart: {
    type: Number,
    required: true
  },
  periodEnd: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('HistoricalLocation', historicalLocationSchema);
