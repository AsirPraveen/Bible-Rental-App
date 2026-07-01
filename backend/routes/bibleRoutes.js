const express = require('express');
const router = express.Router();
const bibleController = require('../controllers/bibleController');
const auth = require('../middleware/auth');

// Get list of supported languages
router.get('/languages', bibleController.getLanguages);

// Get list of books and chapter counts for a specific language
router.get('/books', bibleController.getBooks);

// Get a specific chapter
router.get('/chapter', bibleController.getChapter);

// Get a specific verse (e.g., for comparison across languages)
router.get('/verse', bibleController.getVerse);

// Get contextual meaning using Groq AI
router.post('/dictionary', auth, bibleController.getDictionaryMeaning);

module.exports = router;
