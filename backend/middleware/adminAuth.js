/**
 * Middleware that verifies the user has the Admin role
 * in their currently scoped organization context.
 * Requires auth and orgScope middlewares to be run before this.
 *
 * Platform SuperAdmins pass regardless of membership — they administer every
 * organization by definition, and appSettingsController already relied on that.
 */
const adminAuth = (req, res, next) => {
  if (!req.user || !req.orgId) {
    return res.status(500).json({
      status: 'error',
      message: 'Server configuration error: adminAuth requires auth and orgScope to be run first.'
    });
  }

  if (req.orgRole !== 'Admin' && req.user.globalRole !== 'SuperAdmin') {
    return res.status(403).json({
      status: 'error',
      message: 'Admin access required for this organization.'
    });
  }

  next();
};

module.exports = adminAuth;
