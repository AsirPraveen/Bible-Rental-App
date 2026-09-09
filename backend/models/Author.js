const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  author_id: { type: Number, required: true }, // Scoped unique ID within the organization
  name: { type: String, required: true },
  photo: { type: String }, // URL to the author's photo
  bio: { type: String }, // Author's biography
  books: { type: Number, default: 0 }, // Total number of books by this author
  followers: { type: String, default: '0' }, // Number of followers
  ministry: { type: String, default: 'Unknown' }, // Author's ministry or organization
}, { timestamps: true });

// Scoped unique constraint
authorSchema.index({ organization: 1, author_id: 1 }, { unique: true });

module.exports = mongoose.model('Author', authorSchema, 'Authors');