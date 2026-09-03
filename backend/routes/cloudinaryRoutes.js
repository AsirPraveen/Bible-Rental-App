const express = require('express');
const router = express.Router();
const cloudinaryController = require('../controllers/cloudinaryController');
const auth = require('../middleware/auth');
const orgScope = require('../middleware/orgScope');

// orgScope is required so the controller can confirm the asset belongs to a
// book or post in the caller's own organization before destroying it.
// Signed uploads replace the unsigned presets that used to ship in the app.
router.post('/signature', auth, orgScope, cloudinaryController.getUploadSignature);

router.post('/delete', auth, orgScope, cloudinaryController.deleteImage);

module.exports = router;
