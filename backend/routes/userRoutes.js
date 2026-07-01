const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Authenticated user routes
router.put('/update', auth, userController.updateUser);
router.get('/credits', auth, userController.getUserCredits);
router.post('/deduct-credit', auth, userController.deductCredit);
router.get('/notification-settings', auth, userController.getNotificationSettings);
router.put('/notification-settings', auth, userController.updateNotificationSettings);

// Admin only routes
router.get('/get-all-user', adminAuth, userController.getAllUsers);
router.post('/delete-user', adminAuth, userController.deleteUser);
router.post('/add-credits', adminAuth, userController.addCredits);
router.post('/reset-all-credits', adminAuth, userController.resetAllCredits);
router.get('/search', adminAuth, userController.searchUsers);

module.exports = router;