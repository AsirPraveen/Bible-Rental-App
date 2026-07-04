const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const adminAuth = require('../middleware/adminAuth');
const orgScope = require('../middleware/orgScope');

// Public
router.get('/songs', orgScope, songController.getSongs);
router.get('/songs-metadata', orgScope, songController.getSongsMetadata);
router.get('/songs/:id', orgScope, songController.getSongById);

// Admin CRUD
router.post('/songs', adminAuth, songController.createSong);
router.put('/songs/:id', adminAuth, songController.updateSong);
router.delete('/songs/:id', adminAuth, songController.deleteSong);

module.exports = router;
