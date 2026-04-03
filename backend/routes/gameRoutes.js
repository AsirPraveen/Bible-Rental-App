const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

router.get('/data', gameController.getGameData);
router.get('/cards', gameController.getAllCards);
router.post('/shop/buy-pack', gameController.buyCardPack);
router.post('/deck/equip', gameController.equipDeck);
router.post('/level/complete', gameController.completeLevel);

router.post('/shop/buy-armor', gameController.buyArmorBox);
router.post('/deck/equip-armor', gameController.equipArmor);

router.post('/refine-card', gameController.refineCard);
router.post('/ascend-card', gameController.ascendCard);
router.post('/upgrade-fruit', gameController.upgradeFruit);
router.post('/claim-lore-reward', gameController.claimLoreReward);

module.exports = router;
