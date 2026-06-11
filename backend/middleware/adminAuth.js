const jwt = require('jsonwebtoken');
const User = require('../models/UserDetails');
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware that verifies the user is authenticated AND has Admin role.
 * Use this on all admin-only routes.
 */
const adminAuth = async (req, res, next) => {
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

    if (user.userType !== 'Admin') {
      return res.status(403).send({ status: 'error', message: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).send({ status: 'error', message: 'Invalid token' });
  }
};

module.exports = adminAuth;
