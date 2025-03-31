const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

router.get('/books', bookController.getAllBooks);
router.post('/add-book', bookController.addBook);
router.get('/book-analytics', bookController.getBookAnalytics);
router.post('/submit-rent-request', bookController.submitRentRequest);
router.get('/pending-rent-requests', bookController.getPendingRentRequests);
router.post('/approve-rent-request', bookController.approveRentRequest);
router.post('/reject-rent-request', bookController.rejectRentRequest);
router.post('/return-book', bookController.returnBook);

module.exports = router;