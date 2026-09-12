const mongoose = require('mongoose');

const AppSettingsSchema = new mongoose.Schema({
  isGuestLoginEnabled: { type: Boolean, default: true },
  isGameEnabled: { type: Boolean, default: true },
  isImageGenEnabled: { type: Boolean, default: true },
  // Platform master switch for self-service account deletion. This one
  // CASCADES rather than acting as a fallback: when it is off, no organization
  // can turn deletion back on. Every other flag here is only a default.
  isAccountDeletionEnabled: { type: Boolean, default: false },
  // A guest has no organization, so getAppSettings serves THIS document to
  // them — which makes these the flags the SuperAdmin's Guest Settings screen
  // actually controls. Org-level guestAccess governs signed-in browsing.
  // Only global content is reachable without signing in, hence three keys.
  guestAccess: {
    Bible:             { type: Boolean, default: true },
    HistoricalMaps:    { type: Boolean, default: true },
    BiblicalArtifacts: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('AppSettings', AppSettingsSchema);
