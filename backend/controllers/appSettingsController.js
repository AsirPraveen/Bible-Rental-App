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
  SongPdf: true
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
            isGuestLoginEnabled: globalSettings.isGuestLoginEnabled, // guest login toggle remains global
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

const updateAppSettings = async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'];
    const { isGameEnabled, isImageGenEnabled, isGuestLoginEnabled, guestAccess, features } = req.body;

    // Check permissions:
    // If updating org-specific settings (orgId is present)
    if (orgId) {
      // User must be a member of this org and have Admin role
      const membership = req.user.memberships.find(m => m.organization.toString() === orgId.toString() && m.isActive);
      if (!membership || (membership.role !== 'Admin' && req.user.globalRole !== 'SuperAdmin')) {
        return res.status(403).json({ status: 'Error', message: 'Admin access to this organization is required' });
      }

      const org = await Organization.findById(orgId);
      if (!org) {
        return res.status(404).json({ status: 'Error', message: 'Organization not found' });
      }

      if (org.features) {
        if (isGameEnabled !== undefined) org.features.game = isGameEnabled;
        if (isImageGenEnabled !== undefined) org.features.imageGeneration = isImageGenEnabled;
      }
      
      // Update StuffComponent features
      if (features && typeof features === 'object') {
        org.features = { ...org.features, ...features };
      }
      
      // Update guestAccess for organization if it was sent by GuestSettingsTab
      if (guestAccess && typeof guestAccess === 'object') {
        org.guestAccess = { ...org.guestAccess, ...guestAccess };
      }

      await org.save();

      return res.status(200).json({
        status: 'Success',
        data: {
          isGameEnabled: org.features.game,
          isImageGenEnabled: org.features.imageGeneration,
          guestAccess: org.guestAccess,
          features: org.features
        }
      });
    }

    // Global settings update (Requires SuperAdmin)
    if (req.user.globalRole !== 'SuperAdmin') {
      return res.status(403).json({ status: 'Error', message: 'SuperAdmin access required for global settings' });
    }

    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = new AppSettings();
    }

    if (isGuestLoginEnabled !== undefined) {
      settings.isGuestLoginEnabled = isGuestLoginEnabled;
    }
    if (isGameEnabled !== undefined) {
      settings.isGameEnabled = isGameEnabled;
    }
    if (isImageGenEnabled !== undefined) {
      settings.isImageGenEnabled = isImageGenEnabled;
    }
    if (guestAccess && typeof guestAccess === 'object') {
      settings.guestAccess = { ...settings.guestAccess, ...guestAccess };
    }

    await settings.save();

    res.status(200).json({ 
      status: 'Success', 
      data: settings
    });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
};

module.exports = {
  getAppSettings,
  updateAppSettings
};
