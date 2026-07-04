const mongoose = require('mongoose');

const requestHistorySchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  book_id: { type: Number, required: true },
  book_name: { type: String, required: true },
  status: { type: String, enum: ['approved', 'rejected'], required: true },
  processed_at: { type: Date, default: Date.now },
  requested_at: { type: Date },
});

module.exports = mongoose.model('RequestHistory', requestHistorySchema);