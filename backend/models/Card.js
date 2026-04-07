const mongoose = require("mongoose");

const CardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true }, // e.g., "Humility", "Courage" - The Spiritual Trait
    sinWeakness: { type: String }, // e.g. "Pride", "Fear" - What this card deals 2x damage to
    characterClass: { type: String }, // e.g., "Warrior", "Prophet", "Intercessor"
    isEventCard: { type: Boolean, default: false }, // If true, it's a spell/event card
    eventEffect: { type: String }, // What the event does (e.g. "Heal 50%")
    faction: { type: String }, // e.g., "Patriarchs", "Judges", "Apostles", "Kings"
    rarity: { type: String, default: 'Common' }, // Common, Uncommon, Rare, Legendary
    hp: { type: Number, required: true },
    attack: { type: Number, required: true },
    defense: { type: Number, required: true },
    speed: { type: Number, default: 10 }, // Determines who attacks first
    ability: { type: String }, // e.g., "Prayer Power"
    mainVerse: { type: String }, // e.g., "Philippians 4:13"
    verseText: { type: String }, // Actual text
    missingWord: { type: String }, // The word the player must type
    loreContext: { type: String }, // For the Scroll Room
    imageUrl: { type: String }, // Optional image
    // Ascension
    ascendsTo: { type: String }, // Name of the card it ascends to
    ascensionRequirement: { type: Number, default: 5 }, // Min refinement level to ascend
  },
  {
    collection: "Cards",
    timestamps: true
  }
);

module.exports = mongoose.model("Card", CardSchema);
