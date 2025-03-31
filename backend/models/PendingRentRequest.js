const mongoose = require('mongoose');

const pendingRentRequestSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  book_id: { type: Number, required: true },
  book_name: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('PendingRentRequest', pendingRentRequestSchema);