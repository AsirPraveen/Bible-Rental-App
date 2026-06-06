const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login-user', authController.login);
router.post('/userdata', authController.getUserData);

router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);
router.post('/update-push-token', authController.updatePushToken);
router.post('/google-login', authController.googleLogin);
router.post('/google-set-password', authController.googleSetPassword);

module.exports = router;