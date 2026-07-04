const mongoose = require('mongoose');

const InviteSchema = new mongoose.Schema({
  organization: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true 
  },
  code: { 
    type: String, 
    required: true, 
    unique: true 
  },
  isUsed: { 
    type: Boolean, 
    default: false 
  },
  invitedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'UserInfo', 
    required: true 
  },
  role: {
    type: String,
    enum: ['Admin', 'User'],
    default: 'User'
  }
}, { timestamps: true });

// Auto-expire invitation after 7 days (604800 seconds)
InviteSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('Invite', InviteSchema);
