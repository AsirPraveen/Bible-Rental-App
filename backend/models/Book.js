const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  book_name: { type: String, required: true },
  author_name: { type: String, required: true },
  pages: { type: Number, required: true },
  preface: { type: String },
  cover_image: {type:String},
  thumbnail1: {type:String},
  thumbnail2: {type:String},
  year_of_publication: { type: Number },
  author_id: { type: Number },
  available_count: { type: Number, default: 1 },
  rent_count: { type: Number, default: 0 },
  book_id: { type: Number },
  available: { type: Boolean, default: true },
  owned_by: { type: String, default: null },
  rent_from: { type: Date, default: null },
  likes: { type: Number, default: 0 },
  showInOrg: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema, 'Bible Books');