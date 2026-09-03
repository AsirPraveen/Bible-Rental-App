const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const orgScope = require('../middleware/orgScope');

// Members only. A guest's surface is Bible, Historical Maps and the 3D
// Museum — all global routes — so requiring auth here costs the guest
// flow nothing, and it stops org scope being decided by a client header.
router.get('/songs', auth, orgScope, songController.getSongs);
router.get('/songs-metadata', auth, orgScope, songController.getSongsMetadata);
router.get('/songs/:id', auth, orgScope, songController.getSongById);

// Admin CRUD
router.post('/songs', auth, orgScope, adminAuth, songController.createSong);
router.put('/songs/:id', auth, orgScope, adminAuth, songController.updateSong);
router.delete('/songs/:id', auth, orgScope, adminAuth, songController.deleteSong);
router.post('/songs/:id/toggle-org', auth, orgScope, adminAuth, songController.toggleSongOrg);

module.exports = router;
