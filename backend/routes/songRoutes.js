const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const adminAuth = require('../middleware/adminAuth');

// Public — anyone can view songs
router.get('/songs', songController.getSongs);
router.get('/songs-metadata', songController.getSongsMetadata);
router.get('/songs/:id', songController.getSongById);

// Admin CRUD
router.post('/songs', adminAuth, songController.createSong);
router.put('/songs/:id', adminAuth, songController.updateSong);
router.delete('/songs/:id', adminAuth, songController.deleteSong);

module.exports = router;
