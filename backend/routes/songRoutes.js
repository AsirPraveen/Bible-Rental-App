const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const orgScope = require('../middleware/orgScope');

// Public
router.get('/songs', orgScope, songController.getSongs);
router.get('/songs-metadata', orgScope, songController.getSongsMetadata);
router.get('/songs/:id', orgScope, songController.getSongById);

// Admin CRUD
router.post('/songs', auth, orgScope, adminAuth, songController.createSong);
router.put('/songs/:id', auth, orgScope, adminAuth, songController.updateSong);
router.delete('/songs/:id', auth, orgScope, adminAuth, songController.deleteSong);
router.post('/songs/:id/toggle-org', auth, orgScope, adminAuth, songController.toggleSongOrg);

module.exports = router;
