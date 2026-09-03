const express = require('express');
const router = express.Router();
const imageGenController = require('../controllers/imageGenController');
const auth = require('../middleware/auth');
const orgScope = require('../middleware/orgScope');
const rateLimit = require('express-rate-limit');

// Image generation costs real money per call, so it gets its own tight budget
// on top of the per-user credit check inside the controller.
const imageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { status: 'error', message: 'Too many image requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/generate-verse-image', imageLimiter, auth, orgScope, imageGenController.generateVerseImage);

module.exports = router;
