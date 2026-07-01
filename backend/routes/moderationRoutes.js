const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const adminAuth = require('../middleware/adminAuth');

// All moderation routes require admin authentication
// GET /api/admin/moderation/prayers
router.get('/admin/moderation/prayers', adminAuth, moderationController.getPrayerRequestsForModeration);

// DELETE /api/admin/moderation/prayers/:id
router.delete('/admin/moderation/prayers/:id', adminAuth, moderationController.deletePrayerRequest);

// GET /api/admin/moderation/forum
router.get('/admin/moderation/forum', adminAuth, moderationController.getForumQuestionsForModeration);

// DELETE /api/admin/moderation/forum/:id
router.delete('/admin/moderation/forum/:id', adminAuth, moderationController.deleteForumQuestion);

module.exports = router;
