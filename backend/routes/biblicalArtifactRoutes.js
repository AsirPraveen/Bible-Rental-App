const express = require('express');
const router = express.Router();
const biblicalArtifactController = require('../controllers/biblicalArtifactController');
const superAdminAuth = require('../middleware/superAdminAuth');

// Public endpoints — anyone can view artifacts
router.get('/artifacts', biblicalArtifactController.getAllArtifacts);
router.get('/artifacts/:id', biblicalArtifactController.getArtifactById);

// Admin endpoints — SuperAdmin only (global resources).
// superAdminAuth verifies the bearer token itself, so `auth` is not needed here.
router.post('/artifacts', superAdminAuth, biblicalArtifactController.createArtifact);
router.put('/artifacts/:id', superAdminAuth, biblicalArtifactController.updateArtifact);
router.delete('/artifacts/:id', superAdminAuth, biblicalArtifactController.deleteArtifact);

module.exports = router;
