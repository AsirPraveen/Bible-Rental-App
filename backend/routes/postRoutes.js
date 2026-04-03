const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

router.post('/posts', postController.createPost);
router.get('/posts', postController.getAllPosts);
router.get('/admin/posts', postController.adminGetAllPosts);
router.delete('/posts/:postId', postController.deletePost);
router.put('/posts/:postId/likes', postController.toggleLike);

module.exports = router;