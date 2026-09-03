const AppSettings = require('../models/AppSettings');
const Organization = require('../models/Organization');

const DEFAULT_FEATURES = {
  Bible: true,
  Songs: true,
  HistoricalMaps: true,
  ReadingTracker: true,
  ReadingPlanner: true,
  DiscussionForum: true,
  FastingTracker: true,
  PrayerRequests: true,
  MessageNotes: true,
  BookPdf: true,
  SongPdf: true,
  BiblicalArtifacts: true
};

const getAppSettings = async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'];
    
    // Default global settings
    let globalSettings = await AppSettings.findOne();
    if (!globalSettings) {
      globalSettings = await AppSettings.create({});
    }

    if (orgId) {
      const org = await Organization.findById(orgId);
      if (org) {
        // Ensure default features are present if they were not set before
        const features = { ...DEFAULT_FEATURES, ...(org.features ? (typeof org.features.toJSON === 'function' ? org.features.toJSON() : org.features) : {}) };
        
        // Return organization specific flags matching the expected schema format
        return res.status(200).json({
          status: 'Success',
          data: {
            // Per-org, falling back to the platform default for orgs created
            // before this field existed.
            isGuestLoginEnabled: org.isGuestLoginEnabled !== undefined
              ? org.isGuestLoginEnabled
              : globalSettings.isGuestLoginEnabled,
            isGameEnabled: org.features?.game !== false,
            isImageGenEnabled: org.features?.imageGeneration !== false,
            guestAccess: org.guestAccess || globalSettings.guestAccess,
            features
          }
        });
      }
    }

    // Fallback to global settings
    res.status(200).json({ 
      status: 'Success', 
      data: {
        isGuestLoginEnabled: globalSettings.isGuestLoginEnabled,
        isGameEnabled: globalSettings.isGameEnabled !== false,
        isImageGenEnabled: globalSettings.isImageGenEnabled !== false,
        guestAccess: globalSettings.guestAccess,
        features: DEFAULT_FEATURES
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
};

/**
 * Update this organization's settings.
 *
 * Runs behind auth + orgScope + adminAuth, so the caller is already known to
 * be an Admin of req.orgId (or a platform SuperAdmin). The org comes from the
 * verified membership, never from a client-supplied header.
 */
const updateOrgSettings = async (req, res) => {
  try {
    const { isGameEnabled, isImageGenEnabled, isGuestLoginEnabled, guestAccess, features } = req.body;

    const org = await Organization.findById(req.orgId);
    if (!org) {
      return res.status(404).json({ status: 'Error', message: 'Organization not found' });
    }

    if (org.features) {
      if (isGameEnabled !== undefined) org.features.game = isGameEnabled;
      if (isImageGenEnabled !== undefined) org.features.imageGeneration = isImageGenEnabled;
    }

    if (features && typeof features === 'object') {
      org.features = { ...org.features, ...features };
    }
    if (guestAccess && typeof guestAccess === 'object') {
      org.guestAccess = { ...org.guestAccess, ...guestAccess };
    }
    if (isGuestLoginEnabled !== undefined) {
      org.isGuestLoginEnabled = isGuestLoginEnabled;
    }

    await org.save();

    return res.status(200).json({
      status: 'Success',
      data: {
        isGameEnabled: org.features.game,
        isImageGenEnabled: org.features.imageGeneration,
        isGuestLoginEnabled: org.isGuestLoginEnabled,
        guestAccess: org.guestAccess,
        features: org.features
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
};

/**
 * Update the platform-wide fallback defaults. SuperAdmin only, enforced by the
 * route rather than by a check buried in this function.
 */
const updateGlobalSettings = async (req, res) => {
  try {
    const { isGameEnabled, isImageGenEnabled, isGuestLoginEnabled, guestAccess } = req.body;

    let settings = await AppSettings.findOne();
    if (!settings) settings = new AppSettings();

    if (isGuestLoginEnabled !== undefined) settings.isGuestLoginEnabled = isGuestLoginEnabled;
    if (isGameEnabled !== undefined) settings.isGameEnabled = isGameEnabled;
    if (isImageGenEnabled !== undefined) settings.isImageGenEnabled = isImageGenEnabled;
    if (guestAccess && typeof guestAccess === 'object') {
      settings.guestAccess = { ...settings.guestAccess, ...guestAccess };
    }

    await settings.save();
    res.status(200).json({ status: 'Success', data: settings });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
};

module.exports = {
  getAppSettings,
  updateOrgSettings,
  updateGlobalSettings
};
