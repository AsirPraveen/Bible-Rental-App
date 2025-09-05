const express = require('express');
const router = express.Router();
const cloudinaryController = require('../controllers/cloudinaryController');

router.post('/delete', cloudinaryController.deleteImage);

module.exports = router;