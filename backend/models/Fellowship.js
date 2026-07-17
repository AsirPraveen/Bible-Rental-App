const mongoose = require('mongoose');

const fellowshipSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '📖' }, // Emoji icon for the fellowship

  // Organization scope
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },

  // Creator (admin who gathered the fellowship)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserInfo',
    required: true
  },

  // Members list
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo', required: true },
    role: { type: String, enum: ['shepherd', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    _id: false
  }],

  // Group type: 'normal' = everyone can post, 'announcement' = only shepherds can post
  type: { type: String, enum: ['normal', 'announcement'], default: 'normal' },

  // Cached last message for list preview (denormalized for performance)
  lastMessage: {
    text: { type: String, default: '' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo' },
    senderName: { type: String, default: '' },
    sentAt: { type: Date }
  },

  // Soft archive
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

// Indexes for fast queries
fellowshipSchema.index({ organization: 1, isArchived: 1 });
fellowshipSchema.index({ 'members.user': 1 });
fellowshipSchema.index({ organization: 1, 'lastMessage.sentAt': -1 });

module.exports = mongoose.model('Fellowship', fellowshipSchema);
