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
  const { 
    book_name, 
    author_name, 
    pages, 
    preface, 
    year_of_publication, 
    author_id, 
    book_id, 
    available_count,
    cover_image,
    thumbnail1,
    thumbnail2
  } = req.body;

  try {
    // Check if book ID already exists
    const existingBook = await Book.findOne({ book_id });
    if (existingBook) {
      return res.status(400).send({ status: "error", data: "Book ID already exists" });
    }

    // Validate required fields
    if (!book_name || !author_name || !pages || !year_of_publication || !author_id || !book_id || !available_count) {
      return res.status(400).send({ status: "error", data: "Missing required fields" });
    }

    // Validate numeric fields
    if (isNaN(Number(pages)) || Number(pages) <= 0) {
      return res.status(400).send({ status: "error", data: "Pages must be a valid positive number" });
    }

    if (isNaN(Number(available_count)) || Number(available_count) <= 0) {
      return res.status(400).send({ status: "error", data: "Available count must be a valid positive number" });
    }

    if (isNaN(Number(year_of_publication))) {
      return res.status(400).send({ status: "error", data: "Year of publication must be a valid number" });
    }

    // Create new book
    await Book.create({
      book_name: book_name.trim(),
      author_name: author_name.trim(),
      pages: Number(pages),
      preface: preface?.trim() || '',
      cover_image: cover_image || null,
      thumbnail1: thumbnail1 || null,
      thumbnail2: thumbnail2 || null,
      year_of_publication: Number(year_of_publication),
      author_id: Number(author_id),
      available_count: Number(available_count),
      book_id: Number(book_id),
      rent_count: 0,
      available: true,
      owned_by: null,
      rent_from: null
    });

    res.send({ status: "Ok", data: "Book added successfully" });
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).send({ status: "error", data: "Internal server error while adding book" });
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
        popularBooks: popularBooks || [],
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
    
    // Extract all unique book_ids from pending requests
    const bookIds = users.flatMap(user =>
      user.books_rented
        .filter(request => request.status === 'pending')
        .map(request => request.book_id)
    ).filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

    // Fetch all books in one query
    const books = await Book.find({ book_id: { $in: bookIds } });
    const bookMap = new Map(books.map(book => [book.book_id, book.book_name]));

    // Map users to pending requests with correct book names
    const pendingRequests = users.flatMap(user =>
      user.books_rented
        .filter(request => request.status === 'pending')
        .map(request => ({
          _id: request._id,
          userEmail: user.email,
          userName: user.name,
          book_id: request.book_id,
          book_name: bookMap.get(request.book_id) || 'Unknown',
          status: request.status,
          requested_at: request.requested_at
        }))
    );

    res.send({ status: "Ok", data: pendingRequests });
  } catch (error) {
    console.error('Error fetching pending rent requests:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};
exports.approveRentRequest = async (req, res) => {
  const { userEmail, book_id } = req.body;
  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found" });
    }

    // Find the specific pending request by book_id and status
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

    // Update the book availability and ownership
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

    // Update the specific request status using its _id
    await User.updateOne(
      { email: userEmail, 'books_rented._id': request._id },
      { $set: { 'books_rented.$.status': 'approved' } }
    );

    // Save to request history
    await RequestHistory.create({
      userName: user.name,
      userEmail,
      book_id,
      book_name: book.book_name,
      requested_at: request.requested_at,
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

exports.toggleFavourite = async (req, res) => {
  const { userEmail, book_id } = req.body;
  console.log('Toggle favourite called with:', { userEmail, book_id });
  try {
    // Verify token and fetch user
    const user = await User.findOne({ email: userEmail });
    console.log("user",user);
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found" });
    }

    const book = await Book.findOne({ book_id });
    if (!book) {
      return res.status(404).send({ status: "error", data: "Book not found" });
    }

    // Check if the book is already in favouriteBooks
    const isFavourite = user.favouriteBooks.includes(book_id);
    
    if (isFavourite) {
      // Remove book from favouriteBooks and decrement likes
      await User.updateOne(
        { email: userEmail },
        { $pull: { favouriteBooks: book_id } }
      );
      
      await Book.updateOne(
        { book_id: book_id },
        { $inc: { likes: -1 } } // Decrement likes by 1
      );
      
      res.send({ status: "Ok", data: "Book removed from wishlist" });
    } else {
      // Add book to favouriteBooks and increment likes
      await User.updateOne(
        { email: userEmail },
        { $addToSet: { favouriteBooks: book_id } } // $addToSet prevents duplicates
      );
      
      await Book.updateOne(
        { book_id: book_id },
        { $inc: { likes: 1 } } // Increment likes by 1
      );
      
      res.send({ status: "Ok", data: "Book added to wishlist" });
    }
  } catch (error) {
    console.error('Error toggling favourite:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};