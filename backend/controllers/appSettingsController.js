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
    const { isGameEnabled } = req.body;
    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = new AppSettings();
    }
    settings.isGameEnabled = isGameEnabled;
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
