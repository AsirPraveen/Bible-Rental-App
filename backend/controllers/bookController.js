const Book = require('../models/Book');
const User = require('../models/UserDetails');
const RequestHistory = require('../models/RequestHistory');

exports.getAllBooks = async (req, res) => {
  try {
    const books = await Book.find({});
    res.send({ status: "Ok", data: books });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};

exports.addBook = async (req, res) => {
  const { book_name, author_name, pages, preface, year_of_publication, author_id, book_id } = req.body;
  try {
    const existingBook = await Book.findOne({ book_id });
    if (existingBook) {
      return res.status(400).send({ status: "error", data: "Book ID already exists" });
    }
    await Book.create({
      book_name,
      author_name,
      pages,
      preface,
      year_of_publication,
      author_id,
      book_id,
      rent_count: 0,
      available: true
    });
    res.send({ status: "Ok", data: "Book added successfully" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};

exports.getBookAnalytics = async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments();
    const rentedBooks = await Book.aggregate([
      { $group: { _id: null, totalRented: { $sum: "$rent_count" } } }
    ]);
    const popularBooks = await Book.find().sort({ rent_count: -1 }).limit(5);
    res.send({
      status: "Ok",
      data: {
        totalBooks: totalBooks || 0,
        totalRented: rentedBooks[0]?.totalRented || 0,
        popularBooks: popularBooks || []
      }
    });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};

exports.submitRentRequest = async (req, res) => {
  const { userEmail, book_id, book_name } = req.body;
  try {
    const book = await Book.findOne({ book_id });
    if (!book || !book.available) {
      return res.status(400).send({ status: "error", data: "Book is not available" });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found" });
    }

    // Check if the user already has a pending request for this book
    const existingRequest = user.books_rented.find(
      (request) => request.book_id === book_id && request.status === 'pending'
    );
    if (existingRequest) {
      return res.status(400).send({ status: "error", data: "Rent request already pending" });
    }

    // Add the rent request to the user's books_rented array
    await User.updateOne(
      { email: userEmail },
      { $push: { books_rented: { book_id, status: 'pending', requested_at: new Date() } } }
    );

    res.send({ status: "Ok", data: "Rent request submitted" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};

exports.getPendingRentRequests = async (req, res) => {
  try {
    const users = await User.find({ 'books_rented.status': 'pending' });
    const pendingRequests = users.flatMap(user =>
      user.books_rented
        .filter((request) => request.status === 'pending')
        .map((request) => ({
          _id: request._id,
          userEmail: user.email,
          book_id: request.book_id,
          book_name: ( Book.findOne({ book_id: request.book_id }))?.book_name || 'Unknown',
          status: request.status
        }))
    );
    res.send({ status: "Ok", data: pendingRequests });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};

exports.approveRentRequest = async (req, res) => {
  const { userEmail, book_id } = req.body;
  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found" });
    }

    const request = user.books_rented.find(
      (r) => r.book_id === book_id && r.status === 'pending'
    );
    if (!request) {
      return res.status(404).send({ status: "error", data: "Request not found or already processed" });
    }

    const book = await Book.findOne({ book_id });
    if (!book) {
      return res.status(404).send({ status: "error", data: "Book not found" });
    }

    await Book.updateOne(
      { book_id },
      { 
        $set: { 
          available: false, 
          owned_by: userEmail, 
          rent_from: new Date() 
        }, 
        $inc: { rent_count: 1 } 
      }
    );

    await User.updateOne(
      { email: userEmail, 'books_rented.book_id': book_id },
      { $set: { 'books_rented.$.status': 'approved' } }
    );

    // Save to request history
    await RequestHistory.create({
      userEmail,
      book_id,
      book_name: book.book_name,
      status: 'approved',
    });

    res.send({ status: "Ok", data: "Rent request approved" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};

exports.rejectRentRequest = async (req, res) => {
  const { userEmail, book_id } = req.body;
  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found" });
    }

    const request = user.books_rented.find(
      (r) => r.book_id === book_id && r.status === 'pending'
    );
    if (!request) {
      return res.status(404).send({ status: "error", data: "Request not found or already processed" });
    }

    const book = await Book.findOne({ book_id });
    if (!book) {
      return res.status(404).send({ status: "error", data: "Book not found" });
    }

    await User.updateOne(
      { email: userEmail, 'books_rented.book_id': book_id },
      { $set: { 'books_rented.$.status': 'rejected' } }
    );

    // Save to request history
    await RequestHistory.create({
      userEmail,
      book_id,
      book_name: book.book_name,
      status: 'rejected',
    });

    res.send({ status: "Ok", data: "Rent request rejected" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};

// New endpoint to fetch request history
exports.getRequestHistory = async (req, res) => {
  try {
    const history = await RequestHistory.find().sort({ processed_at: -1 });
    res.send({ status: "Ok", data: history });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};

exports.returnBook = async (req, res) => {
  const { book_id } = req.body;
  try {
    const book = await Book.findOne({ book_id });
    if (!book) {
      return res.status(404).send({ status: "error", data: "Book not found" });
    }
    if (book.available) {
      return res.status(400).send({ status: "error", data: "Book is already available" });
    }
    await Book.updateOne(
      { book_id },
      { $set: { available: true, owned_by: null, rent_from: null } }
    );
    res.send({ status: "Ok", data: "Book returned successfully" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};