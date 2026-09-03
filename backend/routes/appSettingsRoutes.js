const express = require('express');
const router = express.Router();
const appSettingsController = require('../controllers/appSettingsController');
const auth = require('../middleware/auth');
const orgScope = require('../middleware/orgScope');
const adminAuth = require('../middleware/adminAuth');
const superAdminAuth = require('../middleware/superAdminAuth');

// Public — the app reads this before sign-in to know which guest features to
// show. Returns the org's flags when x-organization-id is present.
router.get('/app-settings', appSettingsController.getAppSettings);

// Per-organization settings. Previously this route carried only `auth` and did
// its own role check inside the controller, so any audit of the routers filed
// it as a plain user route.
router.put('/app-settings', auth, orgScope, adminAuth, appSettingsController.updateOrgSettings);

// Platform-wide fallback defaults, used by orgs that predate the per-org flags.
router.put('/app-settings/global', superAdminAuth, appSettingsController.updateGlobalSettings);

module.exports = router;
