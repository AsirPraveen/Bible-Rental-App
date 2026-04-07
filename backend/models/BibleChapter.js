const mongoose = require('mongoose');

const bibleChapterSchema = new mongoose.Schema({
  language: {
    type: String,
    required: true,
    index: true
  },
  bookNumber: {
    type: Number,
    required: true,
  },
  bookName: {
    type: String,
    required: true,
  },
  chapterNumber: {
    type: Number,
    required: true,
  },
  verses: [
    {
      verseNumber: {
        type: Number,
        required: true,
      },
      text: {
        type: String,
        required: true,
      }
    }
  ]
}, { timestamps: true });

// Create a compound unique index to prevent duplicate chapters
bibleChapterSchema.index({ language: 1, bookNumber: 1, chapterNumber: 1 }, { unique: true });

module.exports = mongoose.model('BibleChapter', bibleChapterSchema);
