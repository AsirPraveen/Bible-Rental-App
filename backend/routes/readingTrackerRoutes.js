const express = require('express');
const router = express.Router();
const readingTrackerController = require('../controllers/readingTrackerController');

router.post('/sync', readingTrackerController.syncReadingProgress);

module.exports = router;
