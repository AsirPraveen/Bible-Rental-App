const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true, lowercase: true, trim: true },
  description: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  coverImageUrl: { type: String, default: '' },

  // Contact & Location
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  address: { type: String, default: '' },

  // Plan & Limits (architected for future billing)
  plan: { type: String, enum: ['free', 'basic', 'premium', 'enterprise'], default: 'free' },
  maxMembers: { type: Number, default: 50 },
  maxBooks: { type: Number, default: 100 },

  // Join mechanism
  inviteCode: { type: String, unique: true, sparse: true },
  isPublic: { type: Boolean, default: false },
  requiresApproval: { type: Boolean, default: true },

  // Feature toggles (org-level)
  features: {
    // Enforced server-side by middleware/requireFeature.
    bookRental: { type: Boolean, default: true },
    upperRoom: { type: Boolean, default: true },

    // Surfaced to the client as isGameEnabled / isImageGenEnabled.
    game: { type: Boolean, default: true },
    imageGeneration: { type: Boolean, default: true },

    // Gate the cards on the Stuff screen. PascalCase keys match the screen
    // titles the client navigates to, which is why the casing differs.
    Bible: { type: Boolean, default: true },
    Songs: { type: Boolean, default: true },
    HistoricalMaps: { type: Boolean, default: true },
    ReadingTracker: { type: Boolean, default: true },
    ReadingPlanner: { type: Boolean, default: true },
    DiscussionForum: { type: Boolean, default: true },
    FastingTracker: { type: Boolean, default: true },
    PrayerRequests: { type: Boolean, default: true },
    MessageNotes: { type: Boolean, default: true },
    BookPdf: { type: Boolean, default: true },
    SongPdf: { type: Boolean, default: true },
    BiblicalArtifacts: { type: Boolean, default: true },
  },

  // Whether guests may browse this organization at all, and which features
  // they see once inside. Both live on the org so an org admin can actually
  // change them — the global AppSettings flag was unreachable from the app.
  isGuestLoginEnabled: { type: Boolean, default: true },

  // Guest access (migrated from AppSettings — per-org)
  guestAccess: {
    // A signed-out guest reaches only global content, so these three are the
    // entire guest surface. Anything org-scoped requires signing in.
    Bible:             { type: Boolean, default: true },
    HistoricalMaps:    { type: Boolean, default: true },
    BiblicalArtifacts: { type: Boolean, default: true },
  },

  // Status
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo' },

  // Org-specific email config (optional override, falls back to platform .env)
  emailConfig: {
    senderName: { type: String, default: '' },
    senderEmail: { type: String, default: '' },
  }
}, { timestamps: true });

// Indexes
organizationSchema.index({ isPublic: 1, isActive: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
