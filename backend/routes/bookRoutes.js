const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const orgScope = require('../middleware/orgScope');

// Public
router.get('/books', orgScope, bookController.getAllBooks);

// Authenticated users
router.post('/submit-rent-request', auth, orgScope, bookController.submitRentRequest);
router.post('/toggle-favourite', auth, orgScope, bookController.toggleFavourite);
router.post('/return-book', auth, orgScope, bookController.returnBook);

// Admin only
router.post('/add-book', auth, orgScope, adminAuth, bookController.addBook);
router.get('/book-analytics', auth, orgScope, adminAuth, bookController.getBookAnalytics);
router.get('/pending-rent-requests', auth, orgScope, adminAuth, bookController.getPendingRentRequests);
router.post('/approve-rent-request', auth, orgScope, adminAuth, bookController.approveRentRequest);
router.post('/reject-rent-request', auth, orgScope, adminAuth, bookController.rejectRentRequest);
router.get('/request-history', auth, orgScope, adminAuth, bookController.getRequestHistory);

module.exports = router;