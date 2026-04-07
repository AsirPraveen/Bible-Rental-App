const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');

router.get('/songs', songController.getSongs);
router.get('/songs-metadata', songController.getSongsMetadata);
router.get('/songs/:id', songController.getSongById);

// Admin CRUD
router.post('/songs', songController.createSong);
router.put('/songs/:id', songController.updateSong);
router.delete('/songs/:id', songController.deleteSong);

module.exports = router;
