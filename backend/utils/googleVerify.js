const axios = require('axios');

const GOOGLE_CLIENT_IDS = (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_WEB_CLIENT_ID || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

/**
 * Verifies a Google credential server-side and returns the trusted profile.
 *
 * Accepts either credential the client is able to obtain:
 *  - idToken      — native @react-native-google-signin flow (preferred)
 *  - accessToken  — WebView implicit flow used as an Expo Go fallback
 *
 * Never trust an email address that arrives in the request body; the address
 * this function returns is the only one that has been proven to Google.
 *
 * @returns {Promise<{ email: string, name: string, picture: string, googleId: string }>}
 * @throws  {Error} when the credential is missing, expired, or issued to another app
 */
const verifyGoogleCredential = async ({ idToken, accessToken }) => {
  if (GOOGLE_CLIENT_IDS.length === 0) {
    throw new Error('Google sign-in is not configured on the server (GOOGLE_CLIENT_IDS missing).');
  }

  if (idToken) {
    const { data } = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
      params: { id_token: idToken },
      timeout: 8000
    });

    if (!GOOGLE_CLIENT_IDS.includes(data.aud)) {
      throw new Error('Google credential was issued to a different application.');
    }
    if (data.email_verified !== 'true' && data.email_verified !== true) {
      throw new Error('This Google account does not have a verified email address.');
    }
    if (!data.email) {
      throw new Error('Google credential did not include an email address.');
    }

    return {
      email: data.email.toLowerCase().trim(),
      name: data.name || data.email.split('@')[0],
      picture: data.picture || '',
      googleId: data.sub
    };
  }

  if (accessToken) {
    // tokeninfo tells us who the token was issued to; userinfo tells us who it belongs to.
    const { data: info } = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
      params: { access_token: accessToken },
      timeout: 8000
    });

    if (!GOOGLE_CLIENT_IDS.includes(info.aud)) {
      throw new Error('Google credential was issued to a different application.');
    }

    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 8000
    });

    if (!profile.email) {
      throw new Error('Google credential did not include an email address.');
    }
    if (profile.email_verified === false) {
      throw new Error('This Google account does not have a verified email address.');
    }

    return {
      email: profile.email.toLowerCase().trim(),
      name: profile.name || profile.email.split('@')[0],
      picture: profile.picture || '',
      googleId: profile.sub
    };
  }

  throw new Error('A Google idToken or accessToken is required.');
};

module.exports = { verifyGoogleCredential };
