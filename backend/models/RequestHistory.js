const mongoose = require('mongoose');

const requestHistorySchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  book_id: { type: Number, required: true },
  book_name: { type: String, required: true },
  status: { type: String, enum: ['approved', 'rejected'], required: true },
  processed_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RequestHistory', requestHistorySchema);