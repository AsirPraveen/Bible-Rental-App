const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login-user', authController.login);
router.post('/userdata', authController.getUserData);

module.exports = router;