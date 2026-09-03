const jwt = require('jsonwebtoken');
const User = require('../models/UserDetails');
const JWT_SECRET = process.env.JWT_SECRET;

const ACTIVITY_THROTTLE_MS = 60000;

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ status: 'error', message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(401).send({ status: 'error', message: 'Unauthorized' });
    }

    req.user = user;

    // Refresh the activity timestamp with a targeted, non-blocking $set.
    // A full user.save() here would rewrite the entire document — including
    // cardInventory, readingProgress and books_rented — on every request, and
    // two concurrent requests would each persist their own stale snapshot.
    const now = new Date();
    if (!user.lastActiveAt || (now - new Date(user.lastActiveAt)) > ACTIVITY_THROTTLE_MS) {
      User.updateOne({ _id: user._id }, { $set: { lastActiveAt: now } })
        .catch(err => console.error('Failed to update lastActiveAt:', err.message));
    }
  } catch (error) {
    return res.status(401).send({ status: 'error', message: 'Invalid token' });
  }

  next();
};

module.exports = authMiddleware;
