const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
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

// Create text indexes for searching
songSchema.index({ 
  titleTamil: 'text', 
  titleEnglish: 'text', 
  lyricsTamil: 'text', 
  lyricsEnglish: 'text', 
  topics: 'text' 
});

module.exports = mongoose.model('Song', songSchema);
