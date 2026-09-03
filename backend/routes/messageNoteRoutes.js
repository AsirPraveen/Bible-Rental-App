const express = require('express');
const router = express.Router();
const messageNoteController = require('../controllers/messageNoteController');
const auth = require('../middleware/auth');
const orgScope = require('../middleware/orgScope');
const superAdminAuth = require('../middleware/superAdminAuth');

// Notes shared with the congregation — members of this org only.
router.get('/public', auth, orgScope, messageNoteController.getPublicNotes);

// Personal notes
router.get('/my', auth, orgScope, messageNoteController.getMyNotes);
router.post('/', auth, orgScope, messageNoteController.createNote);
router.put('/:id', auth, orgScope, messageNoteController.updateNote);

// ── SuperAdmin: wipe ALL notes for this organization ──
router.delete('/all', auth, orgScope, superAdminAuth, messageNoteController.deleteAllNotes);

router.delete('/:id', auth, orgScope, messageNoteController.deleteNote);

module.exports = router;
