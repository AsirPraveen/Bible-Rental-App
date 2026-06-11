const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const auth = require('../middleware/auth');

// All game routes require authentication
router.get('/data', auth, gameController.getGameData);
router.get('/cards', auth, gameController.getAllCards);
router.post('/shop/buy-pack', auth, gameController.buyCardPack);
router.post('/deck/equip', auth, gameController.equipDeck);
router.post('/level/complete', auth, gameController.completeLevel);

router.post('/shop/buy-armor', auth, gameController.buyArmorBox);
router.post('/deck/equip-armor', auth, gameController.equipArmor);

router.post('/refine-card', auth, gameController.refineCard);
router.post('/ascend-card', auth, gameController.ascendCard);
router.post('/upgrade-fruit', auth, gameController.upgradeFruit);
router.post('/claim-lore-reward', auth, gameController.claimLoreReward);

module.exports = router;
