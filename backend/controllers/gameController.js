const UserInfo = require('../models/UserDetails');
const Card = require('../models/Card');

// Get all game data for a user
exports.getGameData = async (req, res) => {
  try {
    const email = req.user.email;
    const user = await UserInfo.findOne({ email }).populate('cardInventory.cardId');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 1. Map all inventory items first (as before)
    const mappedInventory = (user.cardInventory || [])
      .filter(item => item && item.cardId)
      .map(item => ({
         ...(item.cardId._doc || item.cardId),
         equippedArmor: item.equippedArmor || [],
         refinementLevel: item.refinementLevel || 0,
         uniqueInstanceId: item._id
      }));

    // 2. Resolve activeDeck and activeEventCard from the mapped inventory
    // They are stored as instance IDs (_id from cardInventory)
    const activeDeck = (user.activeDeck || [])
      .map(instanceId => mappedInventory.find(inv => inv.uniqueInstanceId.toString() === instanceId.toString()))
      .filter(card => card != null);

    const activeEventCard = user.activeEventCard 
      ? mappedInventory.find(inv => inv.uniqueInstanceId.toString() === user.activeEventCard.toString()) 
      : null;

    res.json({
      status: 'ok',
      data: {
        talents: user.talents || 0,
        manna: user.manna || 0,
        cardInventory: mappedInventory,
        activeDeck: activeDeck,
        activeEventCard: activeEventCard,
        armorInventory: user.armorInventory || [],
        completedLevels: user.completedLevels || [],
        lastLoginDate: user.lastLoginDate,
      }
    });
  } catch (error) {
    console.error('getGameData Error:', error);
    res.status(500).json({ status: 'error', data: error.message });
  }
};

// Get all playable cards in the game
exports.getAllCards = async (req, res) => {
  try {
    const cards = await Card.find({});
    res.json({
      status: 'ok',
      data: cards
    });
  } catch (error) {
    console.error('getAllCards Error:', error);
    res.status(500).json({ status: 'error', data: error.message });
  }
};

// Buy a card pack (Gacha system)
exports.buyCardPack = async (req, res) => {
  try {
    const { packType } = req.body;
    const email = req.user.email;
    let cost = 100;
    let numCards = 3;

    if (packType === 'Prophet') { cost = 500; numCards = 4; }
    else if (packType === 'King') { cost = 1500; numCards = 5; }

    const user = await UserInfo.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.talents < cost) {
      return res.status(400).json({ status: 'error', data: 'Insufficient Talents' });
    }

    // Get random cards (excluding Enemies/Bosses)
    const allCards = await Card.find({ faction: { $ne: 'Enemy' } });
    if (allCards.length === 0) return res.status(400).json({ status: 'error', data: 'No playable cards available.' });

    const pulledCards = [];
    const pullObjects = [];
    for (let i = 0; i < numCards; i++) {
        const randomIndex = Math.floor(Math.random() * allCards.length);
        pulledCards.push(allCards[randomIndex]._id);
        pullObjects.push({ 
           cardId: allCards[randomIndex]._id, 
           equippedArmor: [],
           refinementLevel: 0
        });
    }

    // Deduct talents and add cards
    user.talents -= cost;
    user.cardInventory.push(...pullObjects);
    await user.save();

    const updatedUser = await UserInfo.findOne({ email }).populate('cardInventory.cardId');

    res.json({
      status: 'ok',
      data: {
        talents: user.talents,
        // Return freshly mapped cards
        pulledCards: updatedUser.cardInventory.slice(-numCards)
          .filter(item => item && item.cardId)
          .map(item => ({
             ...(item.cardId._doc || item.cardId),
             equippedArmor: item.equippedArmor || [],
             refinementLevel: item.refinementLevel || 0,
             uniqueInstanceId: item._id
          }))
      }
    });

  } catch (error) {
    console.error('buyCardPack Error:', error);
    res.status(500).json({ status: 'error', data: error.message });
  }
};

// Equip deck
exports.equipDeck = async (req, res) => {
  try {
    const { deckIds, eventId } = req.body; // array of up to 3 card IDs, plus 1 optional event ID
    const email = req.user.email;
    
    if (!Array.isArray(deckIds) || deckIds.length > 3) {
        return res.status(400).json({ status: 'error', data: 'Deck cannot exceed 3 cards' });
    }

    const user = await UserInfo.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure they own these cards. Instance ids come from the request body,
    // so every one must resolve to an entry in this user's own inventory.
    const owned = new Set((user.cardInventory || []).map(item => item._id.toString()));

    const unowned = deckIds.filter(id => !owned.has(String(id)));
    if (unowned.length > 0) {
      return res.status(400).json({ status: 'error', data: 'You do not own one or more of those cards.' });
    }
    if (eventId !== undefined && eventId !== null && !owned.has(String(eventId))) {
      return res.status(400).json({ status: 'error', data: 'You do not own that event card.' });
    }

    user.activeDeck = deckIds;
    if (eventId !== undefined) {
      user.activeEventCard = eventId;
    }
    await user.save();

    res.json({
      status: 'ok',
      data: {
          activeDeck: user.activeDeck,
          activeEventCard: user.activeEventCard
      }
    });
  } catch (error) {
    console.error('equipDeck Error:', error);
    res.status(500).json({ status: 'error', data: error.message });
  }
};

// Complete a level
exports.completeLevel = async (req, res) => {
  try {
    const { levelId, bossName } = req.body;
    const email = req.user.email;
    if (!levelId) return res.status(400).json({ error: 'levelId required' });

    const user = await UserInfo.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure it's not already completed to avoid duplicate tracking
    if (!user.completedLevels) user.completedLevels = [];
    if (!user.completedLevels.includes(levelId)) {
        user.completedLevels.push(levelId);
        
        // Give rewards for clearing a level: 50 Talents and 10 Manna
        user.talents = (user.talents || 0) + 50;
        user.manna = (user.manna || 0) + 10;
    }

    // --- NEW: Unlock Lore for cards in the active deck ---
    if (!user.unlockedLore) user.unlockedLore = [];
    
    // Unlock the defeated boss
    if (bossName && !user.unlockedLore.includes(bossName)) {
        user.unlockedLore.push(bossName);
    }

    // Unlock lore for survivors
    for (const instanceId of user.activeDeck) {
        const instance = user.cardInventory.id(instanceId);
        if (instance) {
            const baseCard = await Card.findById(instance.cardId);
            if (baseCard && !user.unlockedLore.includes(baseCard.name)) {
                user.unlockedLore.push(baseCard.name);
            }
        }
    }

    await user.save();

    res.json({
      status: 'ok',
      data: {
        completedLevels: user.completedLevels,
        talents: user.talents,
        manna: user.manna
      }
    });

  } catch (error) {
    console.error('completeLevel Error:', error);
    res.status(500).json({ status: 'error', data: error.message });
  }
};

// Equip Armor to a Card Instance
exports.equipArmor = async (req, res) => {
  try {
    const { uniqueInstanceId, armorName } = req.body;
    const email = req.user.email;
    if (!uniqueInstanceId || !armorName) return res.status(400).json({ error: 'Missing parameters' });

    const user = await UserInfo.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure user owns this armor
    if (!user.armorInventory || !user.armorInventory.includes(armorName)) {
        return res.status(400).json({ status: 'error', data: 'You do not own this piece of Armor.' });
    }

    // Find the specific card instance in inventory
    const cardInstance = user.cardInventory.id(uniqueInstanceId);
    if (!cardInstance) {
        return res.status(404).json({ status: 'error', data: 'Card instance not found in your inventory.' });
    }

    // Limit to 3 pieces of armor per card
    if (!cardInstance.equippedArmor) cardInstance.equippedArmor = [];
    if (cardInstance.equippedArmor.length >= 3) {
         return res.status(400).json({ status: 'error', data: 'This card already has the maximum of 3 armor pieces equipped.' });
    }

    if (cardInstance.equippedArmor.includes(armorName)) {
         return res.status(400).json({ status: 'error', data: 'This armor piece is already equipped to this card.' });
    }

    // Remove the armor from global inventory and equip it to the card
    user.armorInventory = user.armorInventory.filter(a => a !== armorName);
    cardInstance.equippedArmor.push(armorName);
    
    await user.save();

    res.json({
      status: 'ok',
      data: { message: `Equipped ${armorName} successfully!` }
    });

  } catch (error) {
    console.error('equipArmor Error:', error);
    res.status(500).json({ status: 'error', data: error.message });
  }
};

// Purchase a random piece of the Armor of God
exports.buyArmorBox = async (req, res) => {
  try {
    const email = req.user.email;
    const user = await UserInfo.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const cost = 250; // Talents
    if (user.talents < cost) {
       return res.status(400).json({ status: 'error', data: 'Insufficient Talents for an Armor Box.' });
    }

    const armorPieces = [
      "Belt of Truth",
      "Breastplate of Righteousness",
      "Shoes of Peace",
      "Shield of Faith",
      "Helmet of Salvation",
      "Sword of the Spirit"
    ];

    const randomPiece = armorPieces[Math.floor(Math.random() * armorPieces.length)];
    
    if (!user.armorInventory) user.armorInventory = [];
    user.armorInventory.push(randomPiece);
    user.talents -= cost;

    await user.save();

    res.json({
       status: 'ok',
       data: {
         talents: user.talents,
         armorPulled: randomPiece,
         armorInventory: user.armorInventory
       }
    });

  } catch (error) {
    console.error('buyArmorBox Error:', error);
    res.status(500).json({ status: 'error', data: error.message });
  }
};

// Refiner's Fire (Crafting/Upgrading)
exports.refineCard = async (req, res) => {
  try {
    const { baseInstanceId, materialInstanceIds } = req.body;
    const email = req.user.email;
    console.log(`[REFINE] Starting for ${email}`);
    console.log(`[REFINE] Base ID: ${baseInstanceId}`);
    console.log(`[REFINE] Material IDs: ${JSON.stringify(materialInstanceIds)}`);
    
    if (!baseInstanceId || !Array.isArray(materialInstanceIds) || materialInstanceIds.length === 0) {
       return res.status(400).json({ status: 'error', data: 'Invalid parameters for refining.' });
    }

    const user = await UserInfo.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Try finding base card robustly
    let baseCard = user.cardInventory.id(baseInstanceId);
    if (!baseCard) {
       baseCard = user.cardInventory.find(c => c._id.toString() === baseInstanceId.toString());
    }

    if (!baseCard) {
       console.log("[REFINE ERR] Base card instance not found in user inventory.");
       return res.status(400).json({ status: 'error', data: 'The card you want to refine was not found in your inventory.' });
    }

    // Cost calculation (50 talents per material card)
    const cost = 50 * materialInstanceIds.length;
    console.log(`[REFINE] Cost: ${cost}, Current Talents: ${user.talents}`);
    if (user.talents < cost) {
       return res.status(400).json({ status: 'error', data: `Insufficient Talents. You need ${cost} to complete this refinement.` });
    }

    // Validation loop
    const materialsToPull = [];
    for (const matId of materialInstanceIds) {
       if (matId.toString() === baseInstanceId.toString()) {
          return res.status(400).json({ status: 'error', data: 'A card cannot consume itself.' });
       }
       
       let matCard = user.cardInventory.id(matId);
       if (!matCard) {
          matCard = user.cardInventory.find(c => c._id.toString() === matId.toString());
       }

       if (!matCard) {
          console.log(`[REFINE ERR] Material ${matId} not found.`);
          return res.status(400).json({ status: 'error', data: 'One of the selected material cards was not found.' });
       }

       // Structural matching Check
       if (matCard.cardId.toString() !== baseCard.cardId.toString()) {
          console.log(`[REFINE ERR] Type Mismatch. BaseCardType=${baseCard.cardId}, MatCardType=${matCard.cardId}`);
          return res.status(400).json({ status: 'error', data: 'You can only sacrifice duplicate copies of the exact same card.' });
       }
       
       // Equipment Check
       const isEquipped = user.activeDeck.some(id => id && id.toString() === matId.toString());
       if (isEquipped) {
          return res.status(400).json({ status: 'error', data: 'Cannot sacrifice a card that is currently in your Active Deck. Unequip it first.' });
       }
       
       if (user.activeEventCard && user.activeEventCard.toString() === matId.toString()) {
          return res.status(400).json({ status: 'error', data: 'Cannot sacrifice your active Event Spell.' });
       }

       materialsToPull.push(matId);
    }

    // Processing
    console.log(`[REFINE] Validation passed. Consuming ${materialsToPull.length} materials.`);
    console.log(`[REFINE] Current Talents: ${user.talents}. Deducting ${cost}.`);
    
    user.talents -= cost;
    baseCard.refinementLevel = (baseCard.refinementLevel || 0) + materialInstanceIds.length;
    
    // Explicit removal of each material subdocument
    for (const mId of materialsToPull) {
       console.log(`[REFINE] Removing material instance: ${mId}`);
       user.cardInventory.pull({ _id: mId });
    }

    await user.save();
    console.log("[REFINE] Database saved successfully.");

    res.json({
       status: 'ok',
       data: {
          message: `Success! The Refiner's Fire has consumed your duplicates. The card reached Refinement Level ${baseCard.refinementLevel}!`,
          talents: user.talents,
          newRefinementLevel: baseCard.refinementLevel
       }
    });

  } catch (error) {
    console.error('[REFINE FATAL ERROR]:', error);
    res.status(500).json({ status: 'error', data: 'Refining failed due to a server-side error: ' + error.message });
  }
};

// Ascend (Transform) a card
exports.ascendCard = async (req, res) => {
  try {
    const { instanceId } = req.body;
    const email = req.user.email;
    const user = await UserInfo.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const cardIndex = user.cardInventory.findIndex(i => i._id.toString() === instanceId);
    if (cardIndex === -1) return res.status(404).json({ error: 'Card instance not found' });

    const instance = user.cardInventory[cardIndex];
    const baseCard = await Card.findById(instance.cardId);

    if (!baseCard.ascendsTo) return res.status(400).json({ error: 'This card cannot be ascended' });
    if (instance.refinementLevel < (baseCard.ascensionRequirement || 5)) {
      return res.status(400).json({ error: `Requires Refinement Level ${baseCard.ascensionRequirement || 5}` });
    }

    const cost = 50; // 50 Manna to ascend
    if (user.manna < cost) return res.status(400).json({ error: 'Not enough Manna' });

    const ascendedCard = await Card.findOne({ name: baseCard.ascendsTo });
    if (!ascendedCard) return res.status(500).json({ error: 'Ascended card form not found in database' });

    // Transform!
    user.manna -= cost;
    instance.cardId = ascendedCard._id;
    instance.refinementLevel = 0; // Reset refinement for the new form
    
    await user.save();

    res.json({
      status: 'ok',
      message: `${baseCard.name} has ascended into ${ascendedCard.name}!`,
      data: {
        newCard: ascendedCard,
        manna: user.manna
      }
    });

  } catch (error) {
    console.error('ascendCard Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Upgrade a Fruit of the Spirit (Talent Tree)
exports.upgradeFruit = async (req, res) => {
  try {
    const { fruitName } = req.body;
    const email = req.user.email;
    const user = await UserInfo.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.fruitsTree[fruitName]) {
      return res.status(400).json({ error: 'Invalid fruit name' });
    }

    const currentLevel = user.fruitsTree[fruitName].level || 0;
    const cost = (currentLevel + 1) * 20; // Cost increases per level

    if (user.talents < cost) {
      return res.status(400).json({ error: `Insufficient Talents. Need ${cost}.` });
    }

    // Upgrade
    user.talents -= cost;
    user.fruitsTree[fruitName].level = currentLevel + 1;
    user.fruitsTree[fruitName].unlocked = true;

    // Use markModified because fruitsTree is a nested object
    user.markModified('fruitsTree');
    await user.save();

    res.json({
      status: 'ok',
      message: `Successfully cultivated ${fruitName}! Now at Level ${user.fruitsTree[fruitName].level}.`,
      data: {
        fruitsTree: user.fruitsTree,
        talents: user.talents
      }
    });

  } catch (error) {
    console.error('upgradeFruit Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Claim Lore Reward
exports.claimLoreReward = async (req, res) => {
  try {
    const { cardName } = req.body;
    const email = req.user.email;
    const user = await UserInfo.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // In a real system, we might want to check if they've ALREADY claimed it.
    // Let's use a separate field or just check if it exists in unlockedLore
    // For now, let's assume if it's in unlockedLore, they are eligible to CLAIM once.
    // We'll need another field: claimedLoreRewards: [String]
    if (!user.claimedLoreRewards) user.claimedLoreRewards = [];

    if (user.claimedLoreRewards.includes(cardName)) {
      return res.status(400).json({ error: 'Reward already claimed for this scroll' });
    }

    if (!user.unlockedLore.includes(cardName)) {
      return res.status(400).json({ error: 'Lore not yet unlocked' });
    }

    const reward = 10; // 10 Talents per scroll
    user.talents += reward;
    user.claimedLoreRewards.push(cardName);

    await user.save();

    res.json({
      status: 'ok',
      message: `You received ${reward} Talents for studying the scroll of ${cardName}!`,
      data: { talents: user.talents }
    });

  } catch (error) {
    console.error('claimLoreReward Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
