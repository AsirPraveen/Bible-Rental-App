const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const orgScope = require('../middleware/orgScope');

// Authenticated user routes
router.put('/update', auth, userController.updateUser);
router.get('/credits', auth, userController.getUserCredits);
router.post('/deduct-credit', auth, userController.deductCredit);
router.get('/notification-settings', auth, userController.getNotificationSettings);
router.put('/notification-settings', auth, userController.updateNotificationSettings);
router.post('/toggle-liked-verse', auth, userController.toggleLikedVerse);
router.post('/toggle-liked-song', auth, orgScope, userController.toggleLikedSong);

// Self-service account deletion (Google Play requirement). Scoped to the
// caller's own account — deliberately not org-scoped, since an account can
// span several organizations and all of it goes.
router.get('/account-deletion-status', auth, userController.getAccountDeletionStatus);
router.delete('/me', auth, userController.deleteOwnAccount);
// Cancelling is intentionally unguarded by the deletion policy — keeping an
// account must never be harder than losing one.
router.post('/me/cancel-deletion', auth, userController.cancelOwnAccountDeletion);

// Admin only routes
router.get('/get-all-user', auth, orgScope, adminAuth, userController.getAllUsers);
router.post('/delete-user', auth, orgScope, adminAuth, userController.deleteUser);
router.post('/add-credits', auth, orgScope, adminAuth, userController.addCredits);
router.post('/reset-all-credits', auth, orgScope, adminAuth, userController.resetAllCredits);
router.get('/search', auth, orgScope, adminAuth, userController.searchUsers);

module.exports = router;