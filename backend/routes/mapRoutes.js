const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');
const auth = require('../middleware/auth');
const superAdminAuth = require('../middleware/superAdminAuth');

// Public — anyone can view maps and locations
router.get('/maps', mapController.getAllMaps);
router.get('/maps/locations', mapController.getLocations);

// SuperAdmin only — create maps, manage locations (global resources)
router.post('/map/upload-map', auth, superAdminAuth, mapController.createMap);
router.post('/maps/locations', auth, superAdminAuth, mapController.addLocation);
router.delete('/maps/locations/:id', auth, superAdminAuth, mapController.deleteLocation);

module.exports = router;
