const express = require('express');
const router = express.Router();
const fastingController = require('../controllers/fastingController');
const auth = require('../middleware/auth');

// All fasting routes require authentication
router.post('/fasting', auth, fastingController.createFastingPlan);
router.get('/fasting/user/:userId', auth, fastingController.getUserFastingPlans);
router.put('/fasting/:id/status', auth, fastingController.updateFastingStatus);

module.exports = router;
