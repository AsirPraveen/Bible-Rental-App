const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

router.post('/posts', postController.createPost);
router.get('/posts', postController.getAllPosts);
router.put('/posts/:postId/likes', postController.updatePostLikes); // New route for liking/unliking

module.exports = router;