const express = require('express');
const router = express.Router();
const appSettingsController = require('../controllers/appSettingsController');
const adminAuth = require('../middleware/adminAuth');
const orgScope = require('../middleware/orgScope');

// Public — app needs to read settings for guest access checks, resolves per-org
router.get('/app-settings', orgScope, appSettingsController.getAppSettings);

// Admin only — update settings
router.put('/app-settings', adminAuth, appSettingsController.updateAppSettings);

module.exports = router;
