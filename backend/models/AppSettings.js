const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema({
  isGameEnabled: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('AppSettings', appSettingsSchema);
