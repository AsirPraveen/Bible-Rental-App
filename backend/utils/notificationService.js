const axios = require('axios');
const User = require('../models/UserDetails');

/**
 * Sends push notifications to a list of Expo tokens.
 * @param {string[]} tokens - Array of Expo push tokens.
 * @param {string} title - The notification title.
 * @param {string} body - The notification body.
 * @param {Object} data - Additional data to send.
 */
const sendPushNotification = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) return;

  // Filter out null/invalid tokens
  const validTokens = tokens.filter(t => t && t.startsWith('ExponentPushToken'));
  if (validTokens.length === 0) return;

  const chunks = [];
  // Expo allows max 100 per request
  for (let i = 0; i < validTokens.length; i += 100) {
    chunks.push(validTokens.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      await axios.post('https://exp.host/--/api/v2/push/send', chunk.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
      })));
    } catch (error) {
      console.error('Error sending push notification chunk:', error);
    }
  }
};

/**
 * Helper to send a notification to a specific user by their ID, checking their settings.
 * @param {string} userId - Mongoose User ID.
 * @param {string} settingField - The field in notificationSettings to check (e.g., 'forumActivity').
 * @param {string} title - The notification title.
 * @param {string} body - The notification body.
 * @param {Object} data - Additional data to send.
 */
const notifyUserById = async (userId, settingField, title, body, data = {}) => {
  try {
    const user = await User.findById(userId).select('expoPushToken notificationSettings');
    if (!user || !user.expoPushToken) return;

    // Check if user has disabled this notification type
    if (user.notificationSettings && user.notificationSettings[settingField] === false) {
      return;
    }

    await sendPushNotification([user.expoPushToken], title, body, data);
  } catch (err) {
    console.error(`Failed to notify user ${userId}:`, err);
  }
};

/**
 * Helper to notify all Admins.
 * @param {string} title - The notification title.
 * @param {string} body - The notification body.
 * @param {Object} data - Additional data to send.
 */
const notifyAdmins = async (title, body, data = {}) => {
  try {
    const admins = await User.find({ userType: 'Admin', expoPushToken: { $ne: null } }).select('expoPushToken');
    const tokens = admins.map(a => a.expoPushToken);
    if (tokens.length > 0) {
      await sendPushNotification(tokens, title, body, data);
    }
  } catch (err) {
    console.error('Failed to notify admins:', err);
  }
};

module.exports = {
  sendPushNotification,
  notifyUserById,
  notifyAdmins
};
