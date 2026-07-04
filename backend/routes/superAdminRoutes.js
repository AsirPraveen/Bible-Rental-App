const express = require('express');
const router = express.Router();
const superAdminAuth = require('../middleware/superAdminAuth');
const superAdminController = require('../controllers/superAdminController');

// All platform admin operations are guarded by global SuperAdmin status
router.get('/analytics', superAdminAuth, superAdminController.getPlatformAnalytics);
router.get('/organizations', superAdminAuth, superAdminController.listAllOrganizations);
router.get('/organizations/:orgId', superAdminAuth, superAdminController.getOrgDetail);
router.post('/organizations/create', superAdminAuth, superAdminController.createOrganization);
router.post('/organizations/toggle-status', superAdminAuth, superAdminController.toggleOrgStatus);
router.post('/promote', superAdminAuth, superAdminController.promoteToSuperAdmin);

module.exports = router;
