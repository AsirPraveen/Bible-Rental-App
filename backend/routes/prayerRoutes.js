const express = require('express');
const router = express.Router();
const prayerController = require('../controllers/prayerController');
const auth = require('../middleware/auth');
const orgScope = require('../middleware/orgScope');

// Public
router.get('/prayer-requests', orgScope, prayerController.getAllPrayerRequests);

// Authenticated users only
router.post('/prayer-requests', auth, orgScope, prayerController.createPrayerRequest);
router.put('/prayer-requests/:id/pray', auth, orgScope, prayerController.incrementPrayedCount);

module.exports = router;
