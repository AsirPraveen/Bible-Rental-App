const express = require('express');
const router = express.Router();
const cloudinaryController = require('../controllers/cloudinaryController');
const auth = require('../middleware/auth');

// Requires authentication — the controller also validates the JWT in the body
router.post('/delete', auth, cloudinaryController.deleteImage);

module.exports = router;