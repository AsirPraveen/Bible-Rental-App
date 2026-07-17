const mongoose = require('mongoose');

const songAuthorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('SongAuthor', songAuthorSchema);
