const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

router.get('/books', bookController.getAllBooks);
router.get('/books/:id', bookController.getBookById);
router.get('/books/author/:authorId', bookController.getBooksByAuthor);

module.exports = router;