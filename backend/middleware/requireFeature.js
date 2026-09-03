const Organization = require('../models/Organization');

/**
 * Enforces an organization's feature toggle on the server.
 *
 * Must run AFTER orgScope. Several toggles in the admin App Settings screen
 * were previously read only by the client — an admin could switch a feature
 * off, see a success message, and have the feature keep working for anyone
 * who called the API directly (or simply had the screen already open).
 *
 * Admin management routes are deliberately NOT gated: an admin needs to curate
 * a catalogue while the member-facing feature is switched off.
 *
 * @param {string} featureKey Key in Organization.features (e.g. 'upperRoom')
 * @param {string} label      Human name used in the error message
 */
const requireFeature = (featureKey, label) => async (req, res, next) => {
  try {
    const org = await Organization.findById(req.orgId).select('features');
    if (!org) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization not found.',
        code: 'ORG_NOT_FOUND'
      });
    }

    const features = org.features
      ? (typeof org.features.toJSON === 'function' ? org.features.toJSON() : org.features)
      : {};

    // Open by default: a feature that predates its flag stays available until
    // an admin explicitly switches it off.
    if (features[featureKey] === false) {
      return res.status(403).json({
        status: 'error',
        message: `${label} is currently switched off for this organization.`,
        code: 'FEATURE_DISABLED',
        feature: featureKey
      });
    }

    next();
  } catch (error) {
    console.error('requireFeature middleware error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = requireFeature;
