const express = require('express');
const router = express.Router();
const prayerController = require('../controllers/prayerController');
const auth = require('../middleware/auth');
const orgScope = require('../middleware/orgScope');

// Members only. A guest's surface is Bible, Historical Maps and the 3D
// Museum — all global routes — so requiring auth here costs the guest
// flow nothing, and it stops org scope being decided by a client header.
router.get('/prayer-requests', auth, orgScope, prayerController.getAllPrayerRequests);

// Authenticated users only
router.post('/prayer-requests', auth, orgScope, prayerController.createPrayerRequest);
router.put('/prayer-requests/:id/pray', auth, orgScope, prayerController.incrementPrayedCount);

module.exports = router;
