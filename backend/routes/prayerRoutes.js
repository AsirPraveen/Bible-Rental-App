const express = require('express');
const router = express.Router();
const prayerController = require('../controllers/prayerController');

// Define specific routes
router.post('/prayer-requests', prayerController.createPrayerRequest);
router.get('/prayer-requests', prayerController.getAllPrayerRequests);
router.put('/prayer-requests/:id/pray', prayerController.incrementPrayedCount);

module.exports = router;
