const express = require('express');
const router = express.Router();
const orgScope = require('../middleware/orgScope');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const requireFeature = require('../middleware/requireFeature');
const authorController = require('../controllers/authorController');

// Authors are part of the book catalogue, so member reads follow bookRental.
const catalogueRead = [auth, orgScope, requireFeature('bookRental', 'Book rental')];

router.get('/api/authors', catalogueRead, authorController.listAuthors);
router.get('/api/authors/:authorId', catalogueRead, authorController.getAuthor);
router.get('/api/authors/:authorId/books', catalogueRead, authorController.getAuthorBooks);
router.post('/api/authors', auth, orgScope, adminAuth, authorController.createAuthor);

module.exports = router;
