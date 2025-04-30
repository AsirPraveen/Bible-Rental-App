const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema({
  author_id: { type: Number, required: true, unique: true }, // Matches book.author_id
  name: { type: String, required: true },
  photo: { type: String }, // URL to the author's photo
  bio: { type: String }, // Author's biography
  books: { type: Number, default: 0 }, // Total number of books by this author
  followers: { type: String, default: '0' }, // Number of followers (as string for formatting like '2.3M')
}, { timestamps: true });

// Explicitly specify collection name
module.exports = mongoose.model('Author', authorSchema, 'Authors');