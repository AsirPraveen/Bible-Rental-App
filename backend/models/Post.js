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
    required: true,
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
  likes: {
    type: Number,
    default: 0, // Default likes to 0
  },
  likedBy: [{
    type: String, // Store user email or ID
    ref: 'UserInfo', // Reference to UserInfo model
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Post', postSchema);