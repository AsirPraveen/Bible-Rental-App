const express = require('express');
const router = express.Router();
const adminAnalyticsController = require('../controllers/adminAnalyticsController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const orgScope = require('../middleware/orgScope');

// Admin only — get high-level analytics for the admin dashboard
router.get('/admin/analytics', auth, orgScope, adminAuth, adminAnalyticsController.getAnalytics);

module.exports = router;
