const express = require('express');
const router = express.Router();
const Author = require('../models/author');
const Book = require('../models/Book');
const orgScope = require('../middleware/orgScope');

// Get all authors within organization
router.get('/api/authors', orgScope, async (req, res) => {
  try {
    const authors = await Author.find({ organization: req.orgId });
    res.json({ status: 'Ok', data: authors });
  } catch (error) {
    res.status(500).json({ status: 'Error', data: error.message });
  }
});

// Get author by author_id within organization
router.get('/api/authors/:authorId', orgScope, async (req, res) => {
  try {
    let author = await Author.findOne({ author_id: req.params.authorId, organization: req.orgId });
    if (!author) {
      console.warn(`Author with author_id ${req.params.authorId} not found, creating fallback`);
      // Fetch books from same org to get author_name
      const books = await Book.find({ author_id: req.params.authorId, organization: req.orgId });
      if (books.length > 0) {
        author = new Author({
          organization: req.orgId,
          author_id: parseInt(req.params.authorId),
          name: books[0].author_name,
          photo: '',
          bio: 'No bio available',
          followers: '0',
          ministry: 'Unknown',
        });
        await author.save();
        console.log('Created fallback author:', author);
      } else {
        return res.status(404).json({ status: 'Error', data: 'Author and books not found' });
      }
    }

    // Update books count
    const booksCount = await Book.countDocuments({ author_id: req.params.authorId, organization: req.orgId });
    author.books = booksCount;

    res.json({ status: 'Ok', data: author });
  } catch (error) {
    res.status(500).json({ status: 'Error', data: error.message });
  }
});

// Get books by author_id within organization
router.get('/api/authors/:authorId/books', orgScope, async (req, res) => {
  try {
    const books = await Book.find({ author_id: req.params.authorId, organization: req.orgId });
    if (!books.length) return res.status(404).json({ status: 'Error', data: 'No books found' });

    res.json({ status: 'Ok', data: books });
  } catch (error) {
    res.status(500).json({ status: 'Error', data: error.message });
  }
});

module.exports = router;