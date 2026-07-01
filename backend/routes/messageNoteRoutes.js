const express = require('express');
const router = express.Router();
const messageNoteController = require('../controllers/messageNoteController');
const auth = require('../middleware/auth');

// Public notes - no auth required (guests and logged-in users can read)
router.get('/public', messageNoteController.getPublicNotes);


// Personal notes
router.get('/my', auth, messageNoteController.getMyNotes);
router.post('/', auth, messageNoteController.createNote);
router.put('/:id', auth, messageNoteController.updateNote);
router.delete('/:id', auth, messageNoteController.deleteNote);

// ── Dev / Admin: wipe ALL notes from database ──
router.delete('/all', auth, messageNoteController.deleteAllNotes);

module.exports = router;
