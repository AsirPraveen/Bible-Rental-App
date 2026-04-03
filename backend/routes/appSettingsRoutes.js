const express = require('express');
const router = express.Router();
const appSettingsController = require('../controllers/appSettingsController');

router.get('/app-settings', appSettingsController.getAppSettings);
router.put('/app-settings', appSettingsController.updateAppSettings);

module.exports = router;
