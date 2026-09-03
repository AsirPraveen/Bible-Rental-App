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
  // How many copies the library owns in total.
  total_copies: { type: Number, default: 1, min: 0 },

  // How many of those are on the shelf right now.
  // Invariant: total_copies === available_count + owned_by.length
  available_count: { type: Number, default: 1, min: 0 },
  rent_count: { type: Number, default: 0 },
  book_id: { type: Number },
  available: { type: Boolean, default: true },
  // Emails of everyone currently holding a copy — one entry per copy on loan.
  // Mongoose casts an existing string value into a one-element array, so
  // documents written before this was an array keep working.
  owned_by: { type: [String], default: [] },
  rent_from: { type: Date, default: null },
  likes: { type: Number, default: 0 },
  showInOrg: { type: Boolean, default: true }
}, { timestamps: true });

// book_id is a per-organization counter allocated by reading the current max,
// which races under concurrent submissions. The unique index is what actually
// prevents two books sharing an id — addBook retries on the duplicate-key error.
bookSchema.index({ organization: 1, book_id: 1 }, { unique: true });

/**
 * Total copies for a document that predates the total_copies field.
 * Derived from the invariant rather than guessed.
 */
bookSchema.statics.totalCopiesOf = function (book) {
  if (typeof book.total_copies === 'number') return book.total_copies;
  return (book.available_count || 0) + ((book.owned_by || []).length);
};

module.exports = mongoose.model('Book', bookSchema, 'Bible Books');