const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');

// Define specific routes
router.post('/forum/questions', forumController.createQuestion);
router.get('/forum/questions', forumController.getAllQuestions);
router.post('/forum/questions/:questionId/answers', forumController.addAnswer);

module.exports = router;
