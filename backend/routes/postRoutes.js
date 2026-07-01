const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Public — users and guests can view posts
router.get('/posts', postController.getAllPosts);

// Authenticated users
router.put('/posts/:postId/likes', auth, postController.toggleLike);

// Admin only
router.post('/posts', adminAuth, postController.createPost);
router.get('/admin/posts', adminAuth, postController.adminGetAllPosts);
router.delete('/posts/:postId', adminAuth, postController.deletePost);

module.exports = router;