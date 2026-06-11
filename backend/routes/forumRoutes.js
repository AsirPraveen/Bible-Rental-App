const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const auth = require('../middleware/auth');

// Public — anyone can view questions
router.get('/forum/questions', forumController.getAllQuestions);

// Authenticated users only
router.post('/forum/questions', auth, forumController.createQuestion);
router.post('/forum/questions/:questionId/answers', auth, forumController.addAnswer);

module.exports = router;
