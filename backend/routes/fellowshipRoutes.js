const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const orgScope = require('../middleware/orgScope');
const adminAuth = require('../middleware/adminAuth');
const requireFeature = require('../middleware/requireFeature');
const {
  createFellowship,
  getFellowships,
  getFellowshipDetails,
  updateFellowship,
  archiveFellowship,
  addMembers,
  removeMember,
  getMessages,
  getOrgMembersForPicker,
  getQnaAnswers
} = require('../controllers/fellowshipController');

// All routes require auth, org scope, and the Upper Room feature being on.
// The toggle in App Settings previously changed nothing on the server.
router.use(authMiddleware, orgScope, requireFeature('upperRoom', 'The Upper Room'));

// Get org members for fellowship member picker (admin only)
router.get('/org-members', adminAuth, getOrgMembersForPicker);

// CRUD
router.post('/', adminAuth, createFellowship);         // Create fellowship (admin only)
router.get('/', getFellowships);                        // List user's fellowships
router.get('/:id', getFellowshipDetails);               // Fellowship details
router.put('/:id', updateFellowship);                   // Update fellowship (shepherd/admin)
router.patch('/:id/archive', archiveFellowship);        // Archive/unarchive (shepherd/admin)

// Members
router.post('/:id/members', addMembers);                // Add members (shepherd/admin)
router.delete('/:id/members/:userId', removeMember);    // Remove member or self-leave

// Messages
router.get('/:id/messages', getMessages);               // Paginated messages
router.get('/:id/messages/:messageId/answers', getQnaAnswers); // Get secure Q&A answers

module.exports = router;
