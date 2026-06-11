const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');
const adminAuth = require('../middleware/adminAuth');

// Public — anyone can view maps and locations
router.get('/maps', mapController.getAllMaps);
router.get('/maps/locations', mapController.getLocations);

// Admin only — create maps, manage locations
router.post('/map/upload-map', adminAuth, mapController.createMap);
router.post('/maps/locations', adminAuth, mapController.addLocation);
router.delete('/maps/locations/:id', adminAuth, mapController.deleteLocation);

module.exports = router;
