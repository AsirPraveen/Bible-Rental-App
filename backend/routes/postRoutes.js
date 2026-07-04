const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const orgScope = require('../middleware/orgScope');

// Public
router.get('/posts', orgScope, postController.getAllPosts);

// Authenticated users
router.put('/posts/:postId/likes', auth, orgScope, postController.toggleLike);

// Admin only
router.post('/posts', adminAuth, postController.createPost);
router.get('/admin/posts', adminAuth, postController.adminGetAllPosts);
router.delete('/posts/:postId', adminAuth, postController.deletePost);

module.exports = router;