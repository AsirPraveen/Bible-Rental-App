const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  titleTamil: { type: String, required: true },
  titleEnglish: { type: String, default: '' },
  lyricsTamil: { type: String, required: true },
  lyricsEnglish: { type: String, required: true },
  topics: [{ 
    type: String, 
    required: true
  }],
  author: { type: String, default: '' },
  youtubeLink: { type: String, default: '' },
  likes: { type: Number, default: 0 }
}, { timestamps: true });

// Create text indexes for searching within the organization context
songSchema.index({ 
  organization: 1,
  titleTamil: 'text', 
  titleEnglish: 'text', 
  lyricsTamil: 'text', 
  lyricsEnglish: 'text', 
  topics: 'text' 
});

module.exports = mongoose.model('Song', songSchema);
