const express = require('express');
const router = express.Router();
const adminAnalyticsController = require('../controllers/adminAnalyticsController');
const adminAuth = require('../middleware/adminAuth');

// Admin only — get high-level analytics for the admin dashboard
router.get('/admin/analytics', adminAuth, adminAnalyticsController.getAnalytics);

module.exports = router;
