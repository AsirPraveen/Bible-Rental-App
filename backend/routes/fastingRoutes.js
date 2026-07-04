const express = require('express');
const router = express.Router();
const fastingController = require('../controllers/fastingController');
const auth = require('../middleware/auth');
const orgScope = require('../middleware/orgScope');

// All fasting routes require authentication and organization context
router.post('/fasting', auth, orgScope, fastingController.createFastingPlan);
router.get('/fasting/user/:userId', auth, orgScope, fastingController.getUserFastingPlans);
router.put('/fasting/:id/status', auth, orgScope, fastingController.updateFastingStatus);

module.exports = router;
