const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const auth = require('../middleware/auth');
const orgScope = require('../middleware/orgScope');

// Members only. A guest's surface is Bible, Historical Maps and the 3D
// Museum — all global routes — so requiring auth here costs the guest
// flow nothing, and it stops org scope being decided by a client header.
router.get('/forum/questions', auth, orgScope, forumController.getAllQuestions);

// Authenticated users only
router.post('/forum/questions', auth, orgScope, forumController.createQuestion);
router.post('/forum/questions/:questionId/answers', auth, orgScope, forumController.addAnswer);

module.exports = router;
