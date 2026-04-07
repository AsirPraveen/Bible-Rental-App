const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: String,
    required: false,
    trim: true,
  },
  time: {
    type: String,
    default: null,
    trim: true,
  },
  imageUrl: {
    type: String,
    default: null,
  },
  audienceType: {
    type: String,
    enum: ['all', 'specific'],
    default: 'all',
  },
  targetUsers: [{
    type: String, // Store user emails
  }],
  showInNotification: {
    type: Boolean,
    default: false,
  },
  likes: {
    type: Number,
    default: 0,
  },
  likedBy: [{
    type: String,
    ref: 'UserInfo',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Post', postSchema);