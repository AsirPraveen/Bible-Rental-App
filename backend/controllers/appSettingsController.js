const AppSettings = require('../models/AppSettings');

const getAppSettings = async (req, res) => {
  try {
    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = await AppSettings.create({ isGameEnabled: true });
    }
    res.status(200).json({ status: 'Success', data: settings });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
};

const updateAppSettings = async (req, res) => {
  try {
    const { isGameEnabled, guestAccess } = req.body;
    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = new AppSettings();
    }
    if (isGameEnabled !== undefined) {
      settings.isGameEnabled = isGameEnabled;
    }
    if (guestAccess && typeof guestAccess === 'object') {
      // Merge only the provided keys into existing guestAccess
      for (const [key, value] of Object.entries(guestAccess)) {
        if (settings.guestAccess[key] !== undefined) {
          settings.guestAccess[key] = value;
        }
      }
    }
    await settings.save();
    res.status(200).json({ status: 'Success', data: settings });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
};

module.exports = {
  getAppSettings,
  updateAppSettings
};
