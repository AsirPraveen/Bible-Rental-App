const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  book_name: { type: String, required: true },
  author_name: { type: String, required: true },
  pages: { type: Number, required: true },
  preface: { type: String },
  year_of_publication: { type: Number },
  author_id: { type: Number },
  rent_count: { type: Number, default: 0 },
  book_id: { type: Number },
  available: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Bible Books', bookSchema);