const express = require('express');
const router = express.Router();
const readingStatController = require('../controllers/readingStatController');
const auth = require('../middleware/auth');

// Sync user reading stats — requires authentication
router.post('/stats/reading/sync', auth, readingStatController.syncReadingStats);

module.exports = router;
