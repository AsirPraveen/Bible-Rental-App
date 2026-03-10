const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');

// Existing static map endpoints
router.post('/map/upload-map', mapController.createMap);
router.get('/maps', mapController.getAllMaps);

// New dynamic Biblical Locations CRUD
router.get('/maps/locations', mapController.getLocations);
router.post('/maps/locations', mapController.addLocation);
router.delete('/maps/locations/:id', mapController.deleteLocation);

module.exports = router;
