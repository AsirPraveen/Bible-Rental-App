const express = require('express');
const router = express.Router();
const Author = require('../models/author'); // Adjust path based on your project structure
const Book = require('../models/Book');     // Adjust path based on your project structure

// Get all authors
router.get('/api/authors', async (req, res) => {
  try {
    const authors = await Author.find();
    res.json({ status: 'Ok', data: authors });
  } catch (error) {
    res.status(500).json({ status: 'Error', data: error.message });
  }
});

// Get author by author_id
router.get('/api/authors/:authorId', async (req, res) => {
  try {
    let author = await Author.findOne({ author_id: req.params.authorId });
    if (!author) {
      console.warn(`Author with author_id ${req.params.authorId} not found, creating fallback`);
      // Fetch books to get author_name
      const books = await Book.find({ author_id: req.params.authorId });
      if (books.length > 0) {
        author = new Author({
          author_id: parseInt(req.params.authorId),
          name: books[0].author_name,
          photo: '', // Add default or fetch from config
          bio: 'No bio available',
          followers: 'Unknown',
        });
        await author.save();
        console.log('Created fallback author:', author);
      } else {
        return res.status(404).json({ status: 'Error', data: 'Author and books not found' });
      }
    }

    // Update books count
    const booksCount = await Book.countDocuments({ author_id: req.params.authorId });
    author.books = booksCount;

    res.json({ status: 'Ok', data: author });
  } catch (error) {
    res.status(500).json({ status: 'Error', data: error.message });
  }
});

// Get books by author_id
router.get('/api/authors/:authorId/books', async (req, res) => {
  try {
    const books = await Book.find({ author_id: req.params.authorId });
    if (!books.length) return res.status(404).json({ status: 'Error', data: 'No books found' });

    res.json({ status: 'Ok', data: books });
  } catch (error) {
    res.status(500).json({ status: 'Error', data: error.message });
  }
});

module.exports = router;