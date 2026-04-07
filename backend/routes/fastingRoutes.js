const express = require('express');
const router = express.Router();
const fastingController = require('../controllers/fastingController');

// Define specific routes
router.post('/fasting', fastingController.createFastingPlan);
router.get('/fasting/user/:userId', fastingController.getUserFastingPlans);
router.put('/fasting/:id/status', fastingController.updateFastingStatus);

module.exports = router;
