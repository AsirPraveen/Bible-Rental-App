const Book = require('../models/Book');
const User = require('../models/UserDetails');
const RequestHistory = require('../models/RequestHistory');
const EmailTemplate = require('../models/EmailTemplate');
const Organization = require('../models/Organization');
const nodemailer = require('nodemailer');
const { bookApprovalTemplate, bookRejectionTemplate } = require('../config/emailTemplate');
const { notifyOrgAdmins, notifyUserById } = require('../utils/notificationService');

exports.getAllBooks = async (req, res) => {
  try {
    const books = await Book.find({ organization: req.orgId, showInOrg: { $ne: false } });
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
    const org = await Organization.findById(req.orgId);
    if (!org) {
      return res.status(404).send({ status: "error", data: "Organization not found" });
    }

    const currentBooksCount = await Book.countDocuments({ organization: req.orgId });
    if (currentBooksCount >= (org.maxBooks || 100)) {
      return res.status(400).send({ 
        status: "error", 
        data: `Book inventory limit of ${org.maxBooks || 100} books reached for this organization.` 
      });
    }

    // Auto-calculate book_id if not provided
    let finalBookId = book_id;
    if (!finalBookId) {
      const latestBook = await Book.findOne({ organization: req.orgId }).sort({ book_id: -1 });
      finalBookId = latestBook && latestBook.book_id ? (latestBook.book_id + 1) : 1;
    } else {
      finalBookId = Number(finalBookId);
    }

    // Default available_count to 1 if not provided
    const finalAvailableCount = available_count !== undefined && available_count !== '' ? Number(available_count) : 1;

    // Check if book ID already exists in this organization
    const existingBook = await Book.findOne({ book_id: finalBookId, organization: req.orgId });
    if (existingBook) {
      return res.status(400).send({ status: "error", data: "Book ID already exists in this organization" });
    }

    // finalBookId and finalAvailableCount are resolved above and validated as
    // numbers below — including them here made a legitimate 0 report as
    // "missing" instead of hitting the specific numeric message.
    if (!book_name || !author_name || !pages || !year_of_publication || !author_id) {
      return res.status(400).send({ status: "error", data: "Missing required fields" });
    }

    // Validate numeric fields
    if (isNaN(Number(pages)) || Number(pages) <= 0) {
      return res.status(400).send({ status: "error", data: "Pages must be a valid positive number" });
    }

    if (isNaN(finalAvailableCount) || finalAvailableCount <= 0) {
      return res.status(400).send({ status: "error", data: "Available count must be a valid positive number" });
    }

    if (isNaN(Number(year_of_publication))) {
      return res.status(400).send({ status: "error", data: "Year of publication must be a valid number" });
    }

    const fields = {
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
      total_copies: finalAvailableCount,
      available_count: finalAvailableCount,
      rent_count: 0,
      available: true,
      owned_by: [],
      rent_from: null
    };

    // Two admins submitting at once can compute the same next book_id. The
    // unique index on { organization, book_id } rejects the loser, so retry
    // with a freshly read id rather than silently creating a duplicate.
    const MAX_ATTEMPTS = 5;
    let bookId = finalBookId;

    for (let attempt = 1; ; attempt++) {
      try {
        await Book.create({ ...fields, book_id: bookId });
        break;
      } catch (err) {
        const isDuplicate = err && err.code === 11000;
        if (!isDuplicate) throw err;

        // An explicitly requested id that collides is a user error, not a race.
        if (book_id) {
          return res.status(400).send({ status: "error", data: "Book ID already exists in this organization" });
        }
        if (attempt >= MAX_ATTEMPTS) {
          return res.status(409).send({ status: "error", data: "Could not allocate a book ID. Please try again." });
        }

        const latest = await Book.findOne({ organization: req.orgId }).sort({ book_id: -1 });
        bookId = latest && latest.book_id ? latest.book_id + 1 : 1;
      }
    }

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
  // Act on the authenticated caller, never on an email supplied in the body.
  const userEmail = req.user.email;
  const { book_id } = req.body;
  try {
    const book = await Book.findOne({ book_id, organization: req.orgId });
    // Judge availability on the count, not the cached `available` flag.
    if (!book || (book.available_count || 0) <= 0) {
      return res.status(400).send({ status: "error", data: "Book is not available" });
    }

    const user = await User.findOne({ email: userEmail, 'memberships.organization': req.orgId });
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found in this organization" });
    }

    // Check if the user already has a pending request for this book IN THIS ORG.
    // book_id is a per-org counter, so the same number exists in other orgs too.
    const existingRequest = user.books_rented.find(
      (request) => request.book_id === book_id
        && request.status === 'pending'
        && String(request.organization) === String(req.orgId)
    );
    if (existingRequest) {
      return res.status(400).send({ status: "error", data: "Rent request already pending" });
    }

    // One copy per person per title. Without this, someone already holding a
    // copy could be approved for a second one — which decremented the shelf
    // count twice while recording a single borrower.
    const alreadyHolding = user.books_rented.find(
      (r) => r.book_id === book_id
        && r.status === 'approved'
        && String(r.organization) === String(req.orgId)
    );
    if (alreadyHolding) {
      return res.status(400).send({ status: "error", data: "You already have a copy of this book. Please return it first." });
    }

    // Add the rent request to the user's books_rented array
    await User.updateOne(
      { email: userEmail },
      { $push: { books_rented: { book_id, organization: req.orgId, status: 'pending', requested_at: new Date() } } }
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
    const isThisOrg = (request) =>
      request.status === 'pending' && String(request.organization) === String(req.orgId);

    const bookIds = users.flatMap(user =>
      user.books_rented
        .filter(isThisOrg)
        .map(request => request.book_id)
    ).filter((id, index, self) => self.indexOf(id) === index);

    // Fetch all books for this organization in one query
    const books = await Book.find({ book_id: { $in: bookIds }, organization: req.orgId });
    const bookMap = new Map(books.map(book => [book.book_id, book.book_name]));

    // Map users to pending requests with correct book names
    const pendingRequests = users.flatMap(user =>
      user.books_rented
        .filter(isThisOrg)
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

    // book_id is a per-org counter, so the organization must be part of the
    // match — otherwise .find can return another tenant's request.
    const request = user.books_rented.find(
      (r) => r.book_id === book_id
        && r.status === 'pending'
        && String(r.organization) === String(req.orgId)
    );
    if (!request) {
      return res.status(404).send({ status: "error", data: "Request not found or already processed" });
    }

    const book = await Book.findOne({ book_id, organization: req.orgId });
    if (!book) {
      return res.status(404).send({ status: "error", data: "Book not found in this organization" });
    }

    // Claim a copy atomically. Guarding inside the query is what makes this
    // safe: two admins approving at the same moment cannot both take the last
    // copy, and approving more requests than there are copies is refused
    // rather than silently flooring the count at zero.
    const claimed = await Book.findOneAndUpdate(
      {
        book_id,
        organization: req.orgId,
        available_count: { $gt: 0 },
        owned_by: { $ne: userEmail }
      },
      {
        $inc: { available_count: -1, rent_count: 1 },
        $push: { owned_by: userEmail },
        $set: { rent_from: new Date() }
      },
      { new: true }
    );

    if (!claimed) {
      const holding = (book.owned_by || []).includes(userEmail);
      return res.status(409).send({
        status: "error",
        data: holding
          ? "This member already has a copy of this book."
          : "No copies are available right now."
      });
    }

    // Keep the cached display flag in step with the count.
    await Book.updateOne(
      { _id: claimed._id },
      { $set: { available: claimed.available_count > 0 } }
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
      (r) => r.book_id === book_id
        && r.status === 'pending'
        && String(r.organization) === String(req.orgId)
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
  const { book_id } = req.body;
  // Act on the authenticated caller. This route also awards 100 talents, so
  // accepting a body-supplied email made it a currency faucet.
  const targetEmail = req.user.email;

  try {
    const user = await User.findOne({ email: targetEmail, 'memberships.organization': req.orgId });
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found in this organization" });
    }

    // Find an active approved rental for this book IN THIS ORGANIZATION.
    const request = user.books_rented.find(
      (r) => r.book_id === Number(book_id)
        && r.status === 'approved'
        && String(r.organization) === String(req.orgId)
    );
    if (!request) {
      return res.status(400).send({ status: "error", data: "No active approved rental found for this book" });
    }

    const book = await Book.findOne({ book_id, organization: req.orgId });
    if (!book) {
      return res.status(404).send({ status: "error", data: "Book not found in this organization" });
    }

    // Return the copy atomically. The owned_by guard means a double-tap can
    // only succeed once, so the shelf count cannot be inflated past the
    // number of copies the library owns.
    let returned = await Book.findOneAndUpdate(
      { book_id, organization: req.orgId, owned_by: targetEmail },
      { $inc: { available_count: 1 }, $pull: { owned_by: targetEmail }, $set: { available: true } },
      { new: true }
    );

    if (!returned) {
      // Loans approved before owned_by tracked borrowers individually leave
      // the user with an approved request but no entry in owned_by. Give the
      // copy back, but never exceed the number of copies owned.
      const totalCopies = Book.totalCopiesOf(book);
      if ((book.available_count || 0) < totalCopies) {
        returned = await Book.findOneAndUpdate(
          { book_id, organization: req.orgId, available_count: { $lt: totalCopies } },
          { $inc: { available_count: 1 }, $set: { available: true } },
          { new: true }
        );
      }
    }

    // Clear the loan date only once every copy is back on the shelf.
    await Book.updateOne(
      { book_id, organization: req.orgId, owned_by: { $size: 0 } },
      { $set: { rent_from: null } }
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
  const userEmail = req.user.email;
  const { book_id } = req.body;
  try {
    const user = await User.findOne({ email: userEmail, 'memberships.organization': req.orgId });
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found in this organization" });
    }

    const book = await Book.findOne({ book_id, organization: req.orgId });
    if (!book) {
      return res.status(404).send({ status: "error", data: "Book not found in this organization" });
    }

    const isFavourite = user.favouriteBooks && user.favouriteBooks.some(
      f => f.book_id === Number(book_id) && f.organization && f.organization.toString() === req.orgId.toString()
    );
    
    if (isFavourite) {
      await User.updateOne(
        { email: userEmail },
        { $pull: { favouriteBooks: { book_id: Number(book_id), organization: req.orgId } } }
      );
      
      await Book.updateOne(
        { book_id: book_id, organization: req.orgId },
        { $inc: { likes: -1 } }
      );
      
      res.send({ status: "Ok", data: "Book removed from wishlist" });
    } else {
      await User.updateOne(
        { email: userEmail },
        { $addToSet: { favouriteBooks: { book_id: Number(book_id), organization: req.orgId } } }
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

exports.adminGetAllBooks = async (req, res) => {
  try {
    const books = await Book.find({ organization: req.orgId }).sort({ createdAt: -1 });
    res.send({ status: "Ok", data: books });
  } catch (error) {
    console.error('Error fetching admin books:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.updateBook = async (req, res) => {
  const { id } = req.params;
  const {
    book_name,
    author_name,
    pages,
    preface,
    year_of_publication,
    author_id,
    available_count,
    cover_image,
    thumbnail1,
    thumbnail2,
    showInOrg
  } = req.body;

  try {
    const book = await Book.findOne({ _id: id, organization: req.orgId });
    if (!book) {
      return res.status(404).send({ status: "error", data: "Book not found" });
    }

    // Validate numeric fields if they are provided
    if (pages !== undefined && (isNaN(Number(pages)) || Number(pages) <= 0)) {
      return res.status(400).send({ status: "error", data: "Pages must be a valid positive number" });
    }
    if (available_count !== undefined && (isNaN(Number(available_count)) || Number(available_count) < 0)) {
      return res.status(400).send({ status: "error", data: "Available count must be a non-negative number" });
    }
    if (year_of_publication !== undefined && isNaN(Number(year_of_publication))) {
      return res.status(400).send({ status: "error", data: "Year of publication must be a valid number" });
    }

    // Update book details
    if (book_name !== undefined) book.book_name = book_name.trim();
    if (author_name !== undefined) book.author_name = author_name.trim();
    if (pages !== undefined) book.pages = Number(pages);
    if (preface !== undefined) book.preface = preface.trim();
    if (year_of_publication !== undefined) book.year_of_publication = Number(year_of_publication);
    if (author_id !== undefined) book.author_id = Number(author_id);

    // The admin edits how many copies the library owns. The shelf count is
    // then derived, so editing a title while copies are on loan can no longer
    // silently invent or destroy copies.
    if (available_count !== undefined) {
      const newTotal = Number(available_count);
      const onLoan = (book.owned_by || []).length;

      if (newTotal < onLoan) {
        return res.status(400).send({
          status: "error",
          data: `${onLoan} ${onLoan === 1 ? 'copy is' : 'copies are'} currently on loan, so the total cannot be set below ${onLoan}.`
        });
      }

      book.total_copies = newTotal;
      book.available_count = newTotal - onLoan;
      book.available = book.available_count > 0;
    }

    if (cover_image !== undefined) book.cover_image = cover_image;
    if (thumbnail1 !== undefined) book.thumbnail1 = thumbnail1;
    if (thumbnail2 !== undefined) book.thumbnail2 = thumbnail2;
    if (showInOrg !== undefined) book.showInOrg = Boolean(showInOrg);

    await book.save();
    res.send({ status: "Ok", data: book });
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).send({ status: "error", data: error.message || "Internal server error while updating book" });
  }
};

exports.deleteBook = async (req, res) => {
  const { id } = req.params;
  try {
    const book = await Book.findOne({ _id: id, organization: req.orgId });
    if (!book) {
      return res.status(404).send({ status: "error", data: "Book not found" });
    }

    // Deleting a title while copies are out would leave those members with an
    // approved rental pointing at a book that no longer exists — they could
    // never return it, and it would sit in their history forever.
    const onLoan = (book.owned_by || []).length;
    if (onLoan > 0) {
      return res.status(409).send({
        status: "error",
        data: `${onLoan} ${onLoan === 1 ? 'copy is' : 'copies are'} still on loan. Collect ${onLoan === 1 ? 'it' : 'them'} before deleting this book.`
      });
    }

    // Helper to extract Cloudinary public ID from URL and destroy it
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const deleteAsset = async (url) => {
      if (!url) return;
      try {
        const urlParts = url.split('/');
        const versionIndex = urlParts.findIndex(part => part.startsWith('v') && /^\d+$/.test(part.substring(1)));
        let publicId;
        if (versionIndex !== -1 && versionIndex < urlParts.length - 1) {
          publicId = urlParts.slice(versionIndex + 1).join('/').split('.')[0];
        } else {
          publicId = urlParts[urlParts.length - 1].split('.')[0];
        }
        await cloudinary.uploader.destroy(publicId);
        console.log(`Deleted Cloudinary asset: ${publicId}`);
      } catch (err) {
        console.error('Error deleting Cloudinary asset:', err);
      }
    };

    // Delete associated images from Cloudinary
    await deleteAsset(book.cover_image);
    await deleteAsset(book.thumbnail1);
    await deleteAsset(book.thumbnail2);

    await Book.findOneAndDelete({ _id: id, organization: req.orgId });
    res.send({ status: "Ok", data: "Book deleted successfully" });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).send({ status: "error", data: error.message || error });
  }
};