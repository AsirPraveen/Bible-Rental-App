const mongoose = require('mongoose');

const forumAnswerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserInfo',
    required: true
  },
  answerText: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });

const forumQuestionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserInfo',
    required: true
  },
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  answers: [forumAnswerSchema]
}, { timestamps: true });

module.exports = mongoose.model('ForumQuestion', forumQuestionSchema);
