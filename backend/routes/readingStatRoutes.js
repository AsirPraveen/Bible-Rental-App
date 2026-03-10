const express = require('express');
const router = express.Router();
const readingStatController = require('../controllers/readingStatController');

// Sync user reading stats
router.post('/stats/reading/sync', readingStatController.syncReadingStats);

module.exports = router;
