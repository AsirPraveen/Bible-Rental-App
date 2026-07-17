const express = require('express');
const router = express.Router();
const messageNoteController = require('../controllers/messageNoteController');
const auth = require('../middleware/auth');
const orgScope = require('../middleware/orgScope');

// Public notes - scoped to org, guest-accessible
router.get('/public', orgScope, messageNoteController.getPublicNotes);

// Personal notes
router.get('/my', auth, orgScope, messageNoteController.getMyNotes);
router.post('/', auth, orgScope, messageNoteController.createNote);
router.put('/:id', auth, orgScope, messageNoteController.updateNote);

// ── Dev / Admin: wipe ALL notes from database ──
router.delete('/all', auth, orgScope, messageNoteController.deleteAllNotes);

router.delete('/:id', auth, orgScope, messageNoteController.deleteNote);

module.exports = router;
