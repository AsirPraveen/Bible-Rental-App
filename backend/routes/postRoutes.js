const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const orgScope = require('../middleware/orgScope');

// Members only. A guest's surface is Bible, Historical Maps and the 3D
// Museum — all global routes — so requiring auth here costs the guest
// flow nothing, and it stops org scope being decided by a client header.
router.get('/posts', auth, orgScope, postController.getAllPosts);

// Authenticated users
router.put('/posts/:postId/likes', auth, orgScope, postController.toggleLike);

// Admin only
router.post('/posts', auth, orgScope, adminAuth, postController.createPost);
router.get('/admin/posts', auth, orgScope, adminAuth, postController.adminGetAllPosts);
router.delete('/posts/:postId', auth, orgScope, adminAuth, postController.deletePost);

module.exports = router;