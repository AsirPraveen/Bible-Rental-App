const mongoose = require("mongoose");

const UserDetailSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    mobile: String,
    password: String,
    image: String,
    gender: String,
    profession: String,

    // === MULTI-TENANT ROLE SYSTEM ===
    // Global platform role (only 'SuperAdmin' or null for regular users)
    globalRole: { type: String, enum: ['SuperAdmin', null], default: null },

    // Organization memberships — a user can belong to multiple orgs
    memberships: [{
      organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
      role: { type: String, enum: ['Admin', 'User'], default: 'User' },
      joinedAt: { type: Date, default: Date.now },
      isActive: { type: Boolean, default: true }
    }],

    // Currently active organization context
    activeOrganizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },

    // Pending join requests (orgs the user has requested to join)
    pendingJoinRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }],

    // Legacy field kept for backward compatibility during migration
    userType: String,

    secretText: String,
    otp: String,
    otpExpiry: Date,
    otpAttempts: { type: Number, default: 0 },
    books_rented: [{
      book_id: { type: Number },
      organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
      status: { type: String, enum: ['pending', 'approved', 'rejected', 'returned'], default: 'pending' },
      requested_at: { type: Date, default: Date.now }
    }],
    favouriteBooks: [{
      book_id: { type: Number },
      organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }
    }],
    likedVerses: [{
      key: { type: String },
      language: { type: String },
      bookNumber: { type: Number },
      chapterNumber: { type: Number },
      verseNumber: { type: Number },
      text: { type: String },
      citation: { type: String },
      likedAt: { type: Date, default: Date.now }
    }],
    likedSongs: [{
      song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
      organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
      likedAt: { type: Date, default: Date.now }
    }],
    image_generation_credits_available: { 
      type: Number, 
      default: 5 
    },
    talents: { type: Number, default: 0 },
    cardInventory: [{ 
      cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
      equippedArmor: [{ type: String }],
      refinementLevel: { type: Number, default: 0 }
    }],
    activeDeck: [{ type: mongoose.Schema.Types.ObjectId }],
    activeEventCard: { type: mongoose.Schema.Types.ObjectId, default: null },
    armorInventory: [{ type: String }],
    fruitsTree: {
      patience: { level: { type: Number, default: 0 }, unlocked: { type: Boolean, default: false } },
      love: { level: { type: Number, default: 0 }, unlocked: { type: Boolean, default: false } },
      joy: { level: { type: Number, default: 0 }, unlocked: { type: Boolean, default: false } },
      peace: { level: { type: Number, default: 0 }, unlocked: { type: Boolean, default: false } },
      kindness: { level: { type: Number, default: 0 }, unlocked: { type: Boolean, default: false } },
      goodness: { level: { type: Number, default: 0 }, unlocked: { type: Boolean, default: false } },
      faithfulness: { level: { type: Number, default: 0 }, unlocked: { type: Boolean, default: false } },
      gentleness: { level: { type: Number, default: 0 }, unlocked: { type: Boolean, default: false } },
      selfControl: { level: { type: Number, default: 0 }, unlocked: { type: Boolean, default: false } },
    },
    cardStudyArea: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
    completedLevels: [{ type: Number }],
    lastLoginDate: { type: Date },
    lastActiveAt: { type: Date },
    manna: { type: Number, default: 0 },
    unlockedLore: [{ type: String }],
    claimedLoreRewards: [{ type: String }],
    resetPasswordExpires: Date,
    expoPushToken: {
      type: String,
      default: null
    },
    treasuresInHeaven: { type: Number, default: 0 },
    readingProgress: { type: Object, default: {} },
    notificationSettings: {
      type: {
        readingReminders: { type: Boolean, default: true },
        readingReminderTime: { type: String, default: '18:00' },
        // IANA zone (e.g. 'Asia/Kolkata') so the reminder cron fires at the
        // user's local hour rather than the server's.
        timezone: { type: String, default: '' },
        forumActivity: { type: Boolean, default: true },
        prayerActivity: { type: Boolean, default: true },
        rentalUpdates: { type: Boolean, default: true }
      },
      default: {
        readingReminders: true,
        readingReminderTime: '18:00',
        timezone: '',
        forumActivity: true,
        prayerActivity: true,
        rentalUpdates: true
      }
    }
  },
  {
    collection: "UserInfo",
    timestamps: true
  }
);

// Indexes for multi-tenant queries
UserDetailSchema.index({ 'memberships.organization': 1 });
UserDetailSchema.index({ activeOrganizationId: 1 });

module.exports = mongoose.model("UserInfo", UserDetailSchema);