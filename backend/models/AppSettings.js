const mongoose = require('mongoose');

const AppSettingsSchema = new mongoose.Schema({
  isGuestLoginEnabled: { type: Boolean, default: true },
  isGameEnabled: { type: Boolean, default: true },
  isImageGenEnabled: { type: Boolean, default: true },
  guestAccess: {
    Bible:            { type: Boolean, default: true },
    Songs:            { type: Boolean, default: true },
    HistoricalMaps:   { type: Boolean, default: true },
    Notifications:    { type: Boolean, default: false },
    ReadingTracker:   { type: Boolean, default: false },
    ReadingPlanner:   { type: Boolean, default: false },
    DiscussionForum:  { type: Boolean, default: false },
    PrayerRequests:   { type: Boolean, default: false },
    FastingTracker:   { type: Boolean, default: false },
    BookRental:       { type: Boolean, default: false },
    MessageNotes:     { type: Boolean, default: false },
    BookPdf:          { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('AppSettings', AppSettingsSchema);
