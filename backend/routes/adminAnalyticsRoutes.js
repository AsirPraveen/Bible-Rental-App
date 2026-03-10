const express = require('express');
const router = express.Router();
const adminAnalyticsController = require('../controllers/adminAnalyticsController');

// Get high-level analytics for the admin dashboard
router.get('/admin/analytics', adminAnalyticsController.getAnalytics);

module.exports = router;
