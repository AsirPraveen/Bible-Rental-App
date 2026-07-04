const Organization = require('../models/Organization');

const getAppSettings = async (req, res) => {
  try {
    const org = await Organization.findById(req.orgId);
    if (!org) {
      return res.status(404).json({ status: 'Error', message: 'Organization not found' });
    }

    res.status(200).json({ 
      status: 'Success', 
      data: {
        _id: org._id,
        isGameEnabled: org.features.game,
        isImageGenEnabled: org.features.imageGeneration,
        isGuestLoginEnabled: org.isPublic,
        guestAccess: org.guestAccess,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
      } 
    });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
};

const updateAppSettings = async (req, res) => {
  try {
    const { isGameEnabled, isImageGenEnabled, isGuestLoginEnabled, guestAccess } = req.body;
    const org = await Organization.findById(req.orgId);
    if (!org) {
      return res.status(404).json({ status: 'Error', message: 'Organization not found' });
    }

    if (isGameEnabled !== undefined) {
      org.features.game = isGameEnabled;
    }
    if (isImageGenEnabled !== undefined) {
      org.features.imageGeneration = isImageGenEnabled;
    }
    if (isGuestLoginEnabled !== undefined) {
      org.isPublic = isGuestLoginEnabled;
    }
    if (guestAccess && typeof guestAccess === 'object') {
      org.guestAccess = { ...org.guestAccess, ...guestAccess };
    }

    await org.save();

    res.status(200).json({ 
      status: 'Success', 
      data: {
        _id: org._id,
        isGameEnabled: org.features.game,
        isImageGenEnabled: org.features.imageGeneration,
        isGuestLoginEnabled: org.isPublic,
        guestAccess: org.guestAccess,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
      } 
    });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
};

module.exports = {
  getAppSettings,
  updateAppSettings
};
