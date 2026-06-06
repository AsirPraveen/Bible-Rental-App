const mongoose = require('mongoose');

const MessageNoteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserInfo',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Sunday Service', 'Bible Study', 'Prayer Cell', 'Special Meeting', 'Youth Meeting', 'Other']
  },
  content: {
    type: String,
    required: true
  },
  verse: {
    type: String, // Quick reference e.g. "John 3:16"
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  authorEmail: {
    type: String
  },
  highlights: [{
    book: String,
    chapter: Number,
    verse: Number,
    verseText: String,
    color: String,
    note: String,
    language: String
  }],
  voiceNotes: [{
    uri: String, // URL in cloud or local reference
    durationMs: Number,
    label: String,
    createdAt: { type: Date, default: Date.now }
  }],
  reminders: [{
    title: String,
    scheduledTime: Date,
    repeating: Boolean,
    notificationId: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('MessageNote', MessageNoteSchema);
