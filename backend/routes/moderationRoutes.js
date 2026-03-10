const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');

// GET /api/admin/moderation/prayers
router.get('/admin/moderation/prayers', moderationController.getPrayerRequestsForModeration);

// DELETE /api/admin/moderation/prayers/:id
router.delete('/admin/moderation/prayers/:id', moderationController.deletePrayerRequest);

// GET /api/admin/moderation/forum
router.get('/admin/moderation/forum', moderationController.getForumQuestionsForModeration);

// DELETE /api/admin/moderation/forum/:id
router.delete('/admin/moderation/forum/:id', moderationController.deleteForumQuestion);

module.exports = router;
