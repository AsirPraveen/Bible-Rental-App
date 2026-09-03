const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const orgScope = require('../middleware/orgScope');
const requireFeature = require('../middleware/requireFeature');

// Member-facing rental. The admin catalogue routes below stay available so a
// library can be curated while the feature is switched off for members.
const rentalEnabled = requireFeature('bookRental', 'Book rental');

// Members only. A guest's surface is Bible, Historical Maps and the 3D
// Museum — all global routes — so requiring auth here costs the guest
// flow nothing, and it stops org scope being decided by a client header.
router.get('/books', auth, orgScope, rentalEnabled, bookController.getAllBooks);

// Authenticated users
router.post('/submit-rent-request', auth, orgScope, rentalEnabled, bookController.submitRentRequest);
router.post('/toggle-favourite', auth, orgScope, rentalEnabled, bookController.toggleFavourite);
router.post('/return-book', auth, orgScope, rentalEnabled, bookController.returnBook);

// Admin only
router.post('/add-book', auth, orgScope, adminAuth, bookController.addBook);
router.get('/book-analytics', auth, orgScope, adminAuth, bookController.getBookAnalytics);
router.get('/pending-rent-requests', auth, orgScope, adminAuth, bookController.getPendingRentRequests);
router.post('/approve-rent-request', auth, orgScope, adminAuth, bookController.approveRentRequest);
router.post('/reject-rent-request', auth, orgScope, adminAuth, bookController.rejectRentRequest);
router.get('/request-history', auth, orgScope, adminAuth, bookController.getRequestHistory);
router.get('/admin/books', auth, orgScope, adminAuth, bookController.adminGetAllBooks);
router.put('/books/:id', auth, orgScope, adminAuth, bookController.updateBook);
router.delete('/books/:id', auth, orgScope, adminAuth, bookController.deleteBook);

module.exports = router;