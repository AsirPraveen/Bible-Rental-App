const express = require('express');
const router = express.Router();
const prayerController = require('../controllers/prayerController');
const auth = require('../middleware/auth');

// Public — anyone can view prayer requests
router.get('/prayer-requests', prayerController.getAllPrayerRequests);

// Authenticated users only
router.post('/prayer-requests', auth, prayerController.createPrayerRequest);
router.put('/prayer-requests/:id/pray', auth, prayerController.incrementPrayedCount);

module.exports = router;
