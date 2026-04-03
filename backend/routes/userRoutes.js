const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.put('/update', userController.updateUser);
router.get('/get-all-user', userController.getAllUsers);
router.post('/delete-user', userController.deleteUser);

// New credit-related routes
router.get('/credits', userController.getUserCredits);
router.post('/deduct-credit', userController.deductCredit);
router.post('/add-credits', userController.addCredits); // Admin route
router.post('/reset-all-credits', userController.resetAllCredits); // Admin route
router.get('/search', userController.searchUsers); // Admin/Search route


module.exports = router;