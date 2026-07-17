const mongoose = require('mongoose');

const generatedPdfSchema = new mongoose.Schema({
  title: { type: String, required: true },
  html: { type: String, required: true },
  songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('GeneratedPdf', generatedPdfSchema);
