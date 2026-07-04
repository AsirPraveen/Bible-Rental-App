const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const auth = require('../middleware/auth');
const orgScope = require('../middleware/orgScope');

// Public
router.get('/forum/questions', orgScope, forumController.getAllQuestions);

// Authenticated users only
router.post('/forum/questions', auth, orgScope, forumController.createQuestion);
router.post('/forum/questions/:questionId/answers', auth, orgScope, forumController.addAnswer);

module.exports = router;
