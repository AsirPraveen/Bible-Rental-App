const express = require('express');
const router = express.Router();
const appSettingsController = require('../controllers/appSettingsController');
const auth = require('../middleware/auth');
const superAdminAuth = require('../middleware/superAdminAuth');

// Public — app needs to read settings for guest access checks globally
router.get('/app-settings', appSettingsController.getAppSettings);

// SuperAdmin only — update global app-settings
router.put('/app-settings', auth, appSettingsController.updateAppSettings);

module.exports = router;
