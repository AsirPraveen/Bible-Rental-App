const Organization = require('../models/Organization');

/**
 * Middleware that validates organization context.
 * 
 * Supports both authenticated users and guests:
 * - For authenticated users: Uses req.user.activeOrganizationId.
 * - For guests: Looks for headers['x-organization-id'] or query.orgId.
 * 
 * Attaches req.orgId and req.orgRole ('Admin'|'User'|'Guest') to the request.
 */
const orgScope = async (req, res, next) => {
  try {
    let orgId = null;
    let orgRole = 'Guest';

    if (req.user) {
      // Authenticated User flow
      orgId = req.user.activeOrganizationId;
      if (!orgId) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'No active organization selected. Please select an organization first.',
          code: 'NO_ACTIVE_ORG'
        });
      }

      // Find the user's membership for the active org
      const membership = req.user.memberships.find(
        m => m.organization.toString() === orgId.toString() && m.isActive
      );

      if (!membership) {
        return res.status(403).json({ 
          status: 'error', 
          message: 'You are not an active member of this organization.',
          code: 'NOT_ORG_MEMBER'
        });
      }

      orgRole = membership.role; // 'Admin' or 'User'
    } else {
      // Guest flow
      orgId = req.headers['x-organization-id'] || req.query.orgId;
      if (!orgId) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'Organization context is missing. Org ID must be passed in headers or query.',
          code: 'MISSING_ORG_CONTEXT'
        });
      }
    }

    // Verify organization exists and is active
    const org = await Organization.findOne({ _id: orgId, isActive: true });
    if (!org) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Organization not found or is suspended.',
        code: 'ORG_NOT_FOUND'
      });
    }

    // Attach context
    req.orgId = org._id;
    req.orgRole = orgRole;

    next();
  } catch (error) {
    console.error('OrgScope middleware error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = orgScope;
