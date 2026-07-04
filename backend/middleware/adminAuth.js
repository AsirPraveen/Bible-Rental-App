const jwt = require('jsonwebtoken');
const User = require('../models/UserDetails');
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware that verifies the user is authenticated AND has Admin role
 * in their currently active organization.
 * Use this on all org-admin-only routes.
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

    // SuperAdmins bypass org-level admin checks
    if (user.globalRole === 'SuperAdmin') {
      req.user = user;
      return next();
    }

    // Check if user is Admin in their active organization
    const activeOrgId = user.activeOrganizationId;
    if (!activeOrgId) {
      return res.status(400).send({ status: 'error', message: 'No active organization selected' });
    }

    const membership = user.memberships.find(
      m => m.organization.toString() === activeOrgId.toString() && m.isActive
    );

    if (!membership || membership.role !== 'Admin') {
      return res.status(403).send({ status: 'error', message: 'Admin access required for this organization' });
    }

    req.user = user;
    req.orgId = activeOrgId;
    req.orgRole = membership.role;
    next();
  } catch (error) {
    return res.status(401).send({ status: 'error', message: 'Invalid token' });
  }
};

module.exports = adminAuth;
