const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const orgScope = require('../middleware/orgScope');

// All moderation routes require admin authentication and organization scoping
// GET /api/admin/moderation/prayers
router.get('/admin/moderation/prayers', auth, orgScope, adminAuth, moderationController.getPrayerRequestsForModeration);

// DELETE /api/admin/moderation/prayers/:id
router.delete('/admin/moderation/prayers/:id', auth, orgScope, adminAuth, moderationController.deletePrayerRequest);

// GET /api/admin/moderation/forum
router.get('/admin/moderation/forum', auth, orgScope, adminAuth, moderationController.getForumQuestionsForModeration);

// DELETE /api/admin/moderation/forum/:id
router.delete('/admin/moderation/forum/:id', auth, orgScope, adminAuth, moderationController.deleteForumQuestion);

module.exports = router;
