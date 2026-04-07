const mongoose = require('mongoose');

const historicalMapSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true, // URL from cloudinary
  }
}, { timestamps: true });

module.exports = mongoose.model('HistoricalMap', historicalMapSchema);
