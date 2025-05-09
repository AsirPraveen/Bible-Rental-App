const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.put('/update', userController.updateUser);
router.get('/get-all-user', userController.getAllUsers);
router.post('/delete-user', userController.deleteUser);

module.exports = router;