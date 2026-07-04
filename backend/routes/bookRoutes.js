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

// Admin only (adminAuth middleware handles org authentication checks)
router.post('/add-book', adminAuth, bookController.addBook);
router.get('/book-analytics', adminAuth, bookController.getBookAnalytics);
router.get('/pending-rent-requests', adminAuth, bookController.getPendingRentRequests);
router.post('/approve-rent-request', adminAuth, bookController.approveRentRequest);
router.post('/reject-rent-request', adminAuth, bookController.rejectRentRequest);
router.get('/request-history', adminAuth, bookController.getRequestHistory);

module.exports = router;