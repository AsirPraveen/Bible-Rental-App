const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');

// Rate-limited auth routes
router.post('/register', authLimiter, authController.register);
router.post('/login-user', authLimiter, authController.login);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/verify-otp', authLimiter, authController.verifyOtp);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Standard auth routes
router.post('/userdata', authController.getUserData);
router.post('/update-push-token', authController.updatePushToken);
router.post('/google-login', authController.googleLogin);
router.post('/google-set-password', authController.googleSetPassword);

module.exports = router;