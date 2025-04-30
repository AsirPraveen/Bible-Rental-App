const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  book_name: { type: String, required: true },
  author_name: { type: String, required: true },
  pages: { type: Number, required: true },
  preface: { type: String },
  cover_image: {type:String},
  thumbnail1: {type:String},
  thumbnail2: {type:String},
  year_of_publication: { type: Number },
  author_id: { type: Number },
  rent_count: { type: Number, default: 0 },
  book_id: { type: Number },
  available: { type: Boolean, default: true },
  owned_by: { type: String, default: null },
  rent_from: { type: Date, default: null }
}, { timestamps: true });

// Explicitly specify collection name
module.exports = mongoose.model('Book', bookSchema, 'Bible Books');
