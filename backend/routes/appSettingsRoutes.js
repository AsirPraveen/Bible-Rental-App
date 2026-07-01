const express = require('express');
const router = express.Router();
const appSettingsController = require('../controllers/appSettingsController');
const adminAuth = require('../middleware/adminAuth');

// Public — app needs to read settings for guest access checks
router.get('/app-settings', appSettingsController.getAppSettings);

// Admin only — update settings
router.put('/app-settings', adminAuth, appSettingsController.updateAppSettings);

module.exports = router;
