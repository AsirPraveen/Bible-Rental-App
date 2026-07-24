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
router.get('/admins', superAdminAuth, superAdminController.listSuperAdmins);
router.post('/demote', superAdminAuth, superAdminController.demoteFromSuperAdmin);

// Global songs management (SuperAdmin only)
router.get('/songs', superAdminAuth, superAdminController.getGlobalSongs);
router.post('/songs', superAdminAuth, superAdminController.createGlobalSong);
router.put('/songs/:id', superAdminAuth, superAdminController.updateGlobalSong);
router.delete('/songs/:id', superAdminAuth, superAdminController.deleteGlobalSong);
router.post('/songs/:id/toggle-allow', superAdminAuth, superAdminController.toggleGlobalSongAllowed);
router.get('/songs-filters-metadata', superAdminAuth, superAdminController.getFiltersMetadata);
router.post('/songs-filters-metadata/toggle-allow', superAdminAuth, superAdminController.toggleFilterMetadataAllowed);

module.exports = router;
