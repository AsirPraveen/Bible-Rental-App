const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const orgScope = require('../middleware/orgScope');
const adminAuth = require('../middleware/adminAuth');
const organizationController = require('../controllers/organizationController');

// Public browse routes
router.get('/public-directory', organizationController.listPublicOrgs);

// User membership routes
router.post('/create', authMiddleware, organizationController.createOrganization);
router.post('/join-invite', authMiddleware, organizationController.joinByInviteCode);
router.post('/join-request', authMiddleware, organizationController.requestToJoin);
router.post('/switch', authMiddleware, organizationController.switchActiveOrg);

// Organization-scoped routes (requires activeOrg context)
router.get('/details', authMiddleware, orgScope, organizationController.getOrganization);

// OrgAdmin specific routes (requires admin role inside organization context)
router.put('/update', authMiddleware, orgScope, adminAuth, organizationController.updateOrganization);
router.get('/members', authMiddleware, orgScope, adminAuth, organizationController.getOrgMembers);
router.post('/members/approve', authMiddleware, orgScope, adminAuth, organizationController.approveJoinRequest);
router.post('/members/update', authMiddleware, orgScope, adminAuth, organizationController.updateMember);
router.post('/members/invite', authMiddleware, orgScope, adminAuth, organizationController.createInvitation);
router.post('/invite/regenerate', authMiddleware, orgScope, adminAuth, organizationController.regenerateInviteCode);

module.exports = router;
