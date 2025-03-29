const Book = require('../models/UserDetails');

exports.getAllBooks = async (req, res) => {
  try {
    const books = await Book.find({});
    res.send({ status: "Ok", data: books });
  } catch (error) {
    res.send({ error: error.message });
  }
};

exports.getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).send({ error: "Book not found" });
    }
    res.send({ status: "Ok", data: book });
  } catch (error) {
    res.send({ error: error.message });
  }
};

exports.getBooksByAuthor = async (req, res) => {
  try {
    const { authorId } = req.params;
    const books = await Book.find({ author_id: authorId });
    res.send({ status: "Ok", data: books });
  } catch (error) {
    res.send({ error: error.message });
  }
};