const mongoose = require('mongoose');

const StandaloneReminderSchema = new mongoose.Schema({
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
  message: {
    type: String,
    trim: true
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  repeating: {
    type: Boolean,
    default: false
  },
  notificationId: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('StandaloneReminder', StandaloneReminderSchema);
