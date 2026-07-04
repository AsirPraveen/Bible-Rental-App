const jwt = require('jsonwebtoken');
const User = require('../models/UserDetails');
const JWT_SECRET = process.env.JWT_SECRET;

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

    const now = new Date();
    if (!user.lastActiveAt || (now - new Date(user.lastActiveAt)) > 60000) {
      user.lastActiveAt = now;
      await user.save();
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).send({ status: 'error', message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
