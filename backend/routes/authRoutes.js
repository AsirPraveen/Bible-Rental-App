const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authLimiter, sessionLimiter } = require('../middleware/rateLimiter');

// Credential-handling routes — strict budget. This now covers the Google paths,
// which previously had no limiter at all.
router.post('/register', authLimiter, authController.register);
router.post('/login-user', authLimiter, authController.login);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/verify-otp', authLimiter, authController.verifyOtp);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/google-login', authLimiter, authController.googleLogin);
router.post('/google-set-password', authLimiter, authController.googleSetPassword);

// Session traffic — called on every launch and org switch, so a looser budget.
router.post('/userdata', sessionLimiter, authController.getUserData);
router.post('/update-push-token', sessionLimiter, auth, authController.updatePushToken);

module.exports = router;
