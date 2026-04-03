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
    userType: String,
    secretText: String,
    otp: String,
    otpExpiry: Date,
    books_rented: [{
      book_id: { type: Number },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      requested_at: { type: Date, default: Date.now }
    }],
    favouriteBooks: [{ type: Number, ref: 'Book' }],
    image_generation_credits_available: { 
      type: Number, 
      default: 5 
    },
    talents: { type: Number, default: 0 },
    cardInventory: [{ 
      cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
      equippedArmor: [{ type: String }], // E.g., 'Shield of Faith', 'Belt of Truth'
      refinementLevel: { type: Number, default: 0 } // +10% stats per level
    }],
    activeDeck: [{ type: mongoose.Schema.Types.ObjectId }], // References unique instance IDs in cardInventory
    activeEventCard: { type: mongoose.Schema.Types.ObjectId, default: null }, // References unique instance ID in cardInventory
    // New Advanced Mechanics
    armorInventory: [{ type: String }], // 'Shield of Faith', 'Sword of the Spirit', etc.
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
    cardStudyArea: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }], // Cards passively gaining XP from reading
    completedLevels: [{ type: Number }], // Array of level IDs the user has beaten
    lastLoginDate: { type: Date },
    manna: { type: Number, default: 0 }, // Premium currency
    unlockedLore: [{ type: String }], // Names of cards whose lore is unlocked
    claimedLoreRewards: [{ type: String }], // Names of cards whose rewards have been claimed
    resetPasswordExpires: Date,
    expoPushToken: {
      type: String,
      default: null
    },
    // Treasures in Heaven (Bible Reading Progress)
    treasuresInHeaven: { type: Number, default: 0 },
    readingProgress: { type: Object, default: {} },
  },
  {
    collection: "UserInfo",
    timestamps: true
  }
);
module.exports = mongoose.model("UserInfo", UserDetailSchema);