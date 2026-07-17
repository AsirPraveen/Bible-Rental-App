const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  fellowship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fellowship',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserInfo',
    required: true
  },
  senderName: { type: String, default: '' }, // Denormalized for performance

  text: { type: String, required: true, trim: true },

  // Message type: 'text' for regular, 'system' for notifications, 'poll' for polls, 'qna' for Q&A questions
  type: { type: String, enum: ['text', 'system', 'poll', 'qna'], default: 'text' },

  // Read receipts — users who have seen this message
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo' }],

  // Soft delete (message recall)
  isDeleted: { type: Boolean, default: false },

  // Reference to replied-to message
  replyTo: {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    senderName: { type: String },
    text: { type: String }
  },

  // Dynamic payload fields for polls and Q&A questions
  pollData: {
    question: { type: String },
    options: [{
      optionText: { type: String, required: true },
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo' }]
    }],
    allowMultiple: { type: Boolean, default: false }
  },

  qnaData: {
    question: { type: String },
    isAnswerVisibleToAll: { type: Boolean, default: true },
    isOneTimeAnswerable: { type: Boolean, default: false },
    answers: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo', required: true },
      username: { type: String, required: true },
      answerText: { type: String, required: true },
      submittedAt: { type: Date, default: Date.now }
    }]
  },

  // Group emoji reactions
  reactions: [
    {
      emoji: { type: String, required: true },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo', required: true },
      username: { type: String, required: true }
    }
  ]
}, { timestamps: true });

// Primary query index: messages in a fellowship, newest first
messageSchema.index({ fellowship: 1, createdAt: -1 });

// For unread count queries
messageSchema.index({ fellowship: 1, readBy: 1 });

module.exports = mongoose.model('Message', messageSchema);
