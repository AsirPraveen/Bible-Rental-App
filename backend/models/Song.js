const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  organizations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true }],
  titleTamil: { type: String, required: false },
  titleEnglish: { type: String, default: '' },
  lyricsTamil: { type: String, required: false },
  lyricsEnglish: { type: String, required: true },
  topics: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'SongTopic',
    index: true
  }],
  songbooks: [{
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'SongBook',
    index: true
  }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'SongAuthor', index: true },
  youtubeLink: { type: String, default: '' },
  likes: { type: Number, default: 0 },
  isGlobal: { type: Boolean, default: false, index: true },
  sqliteId: { type: Number, index: true },
  allowed: { type: Boolean, default: true, index: true }
}, { timestamps: true });

// Create text indexes for searching within the organization context
songSchema.index({ 
  organizations: 1,
  titleTamil: 'text', 
  titleEnglish: 'text', 
  lyricsTamil: 'text', 
  lyricsEnglish: 'text'
});

module.exports = mongoose.model('Song', songSchema);
