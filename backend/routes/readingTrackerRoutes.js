const express = require('express');
const router = express.Router();
const readingTrackerController = require('../controllers/readingTrackerController');
const auth = require('../middleware/auth');

// Sync reading progress — requires authentication
router.post('/sync', auth, readingTrackerController.syncReadingProgress);

module.exports = router;
