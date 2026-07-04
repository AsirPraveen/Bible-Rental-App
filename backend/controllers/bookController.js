const Book = require('../models/Book');
const User = require('../models/UserDetails');
const RequestHistory = require('../models/RequestHistory');
const EmailTemplate = require('../models/EmailTemplate');
const nodemailer = require('nodemailer');
const { bookApprovalTemplate, bookRejectionTemplate } = require('../config/emailTemplate');
const { notifyOrgAdmins, notifyUserById } = require('../utils/notificationService');

exports.getAllBooks = async (req, res) => {
  try {
    const books = await Book.find({ organization: req.orgId });
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
    // Check if book ID already exists in this organization
    const existingBook = await Book.findOne({ book_id, organization: req.orgId });
    if (existingBook) {
      return res.status(400).send({ status: "error", data: "Book ID already exists in this organization" });
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
      organization: req.orgId,
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
    const totalBooks = await Book.countDocuments({ organization: req.orgId });
    const rentedBooks = await Book.aggregate([
      { $match: { organization: req.orgId } },
      { $group: { _id: null, totalRented: { $sum: "$rent_count" } } }
    ]);
    const popularBooks = await Book.find({ organization: req.orgId }).sort({ rent_count: -1 }).limit(5);
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
  const { userEmail, book_id } = req.body;
  try {
    const book = await Book.findOne({ book_id, organization: req.orgId });
    if (!book || !book.available) {
      return res.status(400).send({ status: "error", data: "Book is not available" });
    }

    const user = await User.findOne({ email: userEmail, 'memberships.organization': req.orgId });
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found in this organization" });
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

    // Notify Admins of this specific organization of new request
    await notifyOrgAdmins(
        req.orgId,
        'New Book Rental Request 📚',
        `User ${user.name || userEmail} has requested to rent "${book.book_name}".`,
        { bookId: book_id, type: 'rental_request' }
    );

    res.send({ status: "Ok", data: "Rent request submitted" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};

exports.getPendingRentRequests = async (req, res) => {
  try {
    // Only fetch users that are members of this organization and have pending requests
    const users = await User.find({ 
      'books_rented.status': 'pending',
      'memberships.organization': req.orgId
    });
    
    // Extract all unique book_ids from pending requests
    const bookIds = users.flatMap(user =>
      user.books_rented
        .filter(request => request.status === 'pending')
        .map(request => request.book_id)
    ).filter((id, index, self) => self.indexOf(id) === index);

    // Fetch all books for this organization in one query
    const books = await Book.find({ book_id: { $in: bookIds }, organization: req.orgId });
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
    const user = await User.findOne({ email: userEmail, 'memberships.organization': req.orgId });
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found in this organization" });
    }

    // Find the specific pending request by book_id and status
    const request = user.books_rented.find(
      (r) => r.book_id === book_id && r.status === 'pending'
    );
    if (!request) {
      return res.status(404).send({ status: "error", data: "Request not found or already processed" });
    }

    const book = await Book.findOne({ book_id, organization: req.orgId });
    if (!book) {
      return res.status(404).send({ status: "error", data: "Book not found in this organization" });
    }

    // Update the book availability and ownership
    const newAvailableCount = Math.max((book.available_count || 1) - 1, 0);
    await Book.updateOne(
      { book_id, organization: req.orgId },
      { 
        $set: { 
          available: newAvailableCount > 0, 
          owned_by: userEmail, 
          rent_from: new Date(),
          available_count: newAvailableCount
        }, 
        $inc: { rent_count: 1 } 
      }
    );

    // Update the specific request status using its _id and award 50 Talents
    await User.updateOne(
      { email: userEmail, 'books_rented._id': request._id },
      { 
        $set: { 'books_rented.$.status': 'approved' },
        $inc: { talents: 50 } 
      }
    );

    // Save to request history
    await RequestHistory.create({
      organization: req.orgId,
      userName: user.name,
      userEmail,
      book_id,
      book_name: book.book_name,
      requested_at: request.requested_at,
      status: 'approved',
    });

    // Send Approval Email (try loading org specific template or global)
    try {
      const template = await EmailTemplate.findOne({ templateId: 'book_approval', organization: req.orgId });
      if (template) {
        let subject = template.subject;
        let body = template.body;

        body = body.replace(/{{userName}}/gi, user.name || 'User');
        body = body.replace(/{{bookName}}/gi, book.book_name);

        const transporter = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: userEmail,
          subject: subject,
          html: bookApprovalTemplate(user.name || 'User', body),
        });
        console.log(`Approval email sent to ${userEmail}`);
      }
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
    }

    // Notify User of approval
    await notifyUserById(
        user._id,
        'rentalUpdates',
        'Book Request Approved! 🎉',
        `Your request for "${book.book_name}" has been approved. You've earned 50 Talents!`,
        { bookId: book_id, type: 'rental_update' }
    );

    res.send({ status: "Ok", data: "Rent request approved" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};

exports.rejectRentRequest = async (req, res) => {
  const { userEmail, book_id } = req.body;
  try {
    const user = await User.findOne({ email: userEmail, 'memberships.organization': req.orgId });
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found in this organization" });
    }

    const request = user.books_rented.find(
      (r) => r.book_id === book_id && r.status === 'pending'
    );
    if (!request) {
      return res.status(404).send({ status: "error", data: "Request not found or already processed" });
    }

    const book = await Book.findOne({ book_id, organization: req.orgId });
    if (!book) {
      return res.status(404).send({ status: "error", data: "Book not found in this organization" });
    }

    await User.updateOne(
      { email: userEmail, 'books_rented._id': request._id },
      { $set: { 'books_rented.$.status': 'rejected' } }
    );

    // Save to request history
    await RequestHistory.create({
      organization: req.orgId,
      userEmail,
      book_id,
      book_name: book.book_name,
      status: 'rejected',
    });

    // Send Rejection Email
    try {
      const template = await EmailTemplate.findOne({ templateId: 'book_rejection', organization: req.orgId });
      if (template) {
        let subject = template.subject;
        let body = template.body;

        body = body.replace(/{{userName}}/gi, user.name || 'User');
        body = body.replace(/{{bookName}}/gi, book.book_name);

        const transporter = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: userEmail,
          subject: subject,
          html: bookRejectionTemplate(user.name || 'User', body),
        });
        console.log(`Rejection email sent to ${userEmail}`);
      }
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError);
    }

    // Notify User of rejection
    await notifyUserById(
        user._id,
        'rentalUpdates',
        'Book Request Update 📖',
        `Sorry, your request for "${book.book_name}" could not be approved at this time.`,
        { bookId: book_id, type: 'rental_update' }
    );

    res.send({ status: "Ok", data: "Rent request rejected" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};

exports.getRequestHistory = async (req, res) => {
  try {
    const history = await RequestHistory.find({ organization: req.orgId }).sort({ processed_at: -1 });
    res.send({ status: "Ok", data: history });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};

exports.returnBook = async (req, res) => {
  const { book_id, userEmail } = req.body;
  const targetEmail = userEmail || (req.user ? req.user.email : null);
  
  if (!targetEmail) {
    return res.status(400).send({ status: "error", data: "User email is required" });
  }

  try {
    const user = await User.findOne({ email: targetEmail, 'memberships.organization': req.orgId });
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found in this organization" });
    }

    // Find an active approved rental request for this book
    const request = user.books_rented.find(
      (r) => r.book_id === Number(book_id) && r.status === 'approved'
    );
    if (!request) {
      return res.status(400).send({ status: "error", data: "No active approved rental found for this book" });
    }

    const book = await Book.findOne({ book_id, organization: req.orgId });
    if (!book) {
      return res.status(404).send({ status: "error", data: "Book not found in this organization" });
    }

    // Update book availability and increment available_count
    const newAvailableCount = (book.available_count || 0) + 1;
    await Book.updateOne(
      { book_id, organization: req.orgId },
      { 
        $set: { 
          available: true, 
          available_count: newAvailableCount,
          owned_by: null,
          rent_from: null
        } 
      }
    );

    // Update the specific request status to 'returned' and award 100 Talents
    await User.updateOne(
      { email: targetEmail, 'books_rented._id': request._id },
      { 
        $set: { 'books_rented.$.status': 'returned' },
        $inc: { talents: 100 } 
      }
    );

    // Notify Admins of this specific organization of return
    await notifyOrgAdmins(
        req.orgId,
        'Book Returned 📚',
        `The book "${book.book_name}" has been returned by ${user.name || targetEmail} and is now available for others.`,
        { bookId: book_id, type: 'rental_return' }
    );

    res.send({ status: "Ok", data: "Book returned successfully" });
  } catch (error) {
    res.status(500).send({ status: "error", data: error.message || error });
  }
};

exports.toggleFavourite = async (req, res) => {
  const { userEmail, book_id } = req.body;
  try {
    const user = await User.findOne({ email: userEmail, 'memberships.organization': req.orgId });
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found in this organization" });
    }

    const book = await Book.findOne({ book_id, organization: req.orgId });
    if (!book) {
      return res.status(404).send({ status: "error", data: "Book not found in this organization" });
    }

    const isFavourite = user.favouriteBooks.includes(book_id);
    
    if (isFavourite) {
      await User.updateOne(
        { email: userEmail },
        { $pull: { favouriteBooks: book_id } }
      );
      
      await Book.updateOne(
        { book_id: book_id, organization: req.orgId },
        { $inc: { likes: -1 } }
      );
      
      res.send({ status: "Ok", data: "Book removed from wishlist" });
    } else {
      await User.updateOne(
        { email: userEmail },
        { $addToSet: { favouriteBooks: book_id } }
      );
      
      await Book.updateOne(
        { book_id: book_id, organization: req.orgId },
        { $inc: { likes: 1 } }
      );
      
      res.send({ status: "Ok", data: "Book added to wishlist" });
    }
  } catch (error) {
    console.error('Error toggling favourite:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};