const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema({
  isGameEnabled: {
    type: Boolean,
    default: true
  },
  isImageGenEnabled: {
    type: Boolean,
    default: true
  },
  // Guest access toggles — controlled from Admin panel
  guestAccess: {
    Bible:            { type: Boolean, default: true },
    Songs:            { type: Boolean, default: true },
    HistoricalMaps:   { type: Boolean, default: true },
    Notifications:    { type: Boolean, default: true },
    DiscussionForum:  { type: Boolean, default: false },
    PrayerRequests:   { type: Boolean, default: false },
    FastingTracker:   { type: Boolean, default: false },
    BookRental:       { type: Boolean, default: false },
    MessageNotes:     { type: Boolean, default: false },
    ReadingTracker:   { type: Boolean, default: true },
    ReadingPlanner:   { type: Boolean, default: true },
    BookPdf:          { type: Boolean, default: false },
  }
}, { timestamps: true });

module.exports = mongoose.model('AppSettings', appSettingsSchema);
