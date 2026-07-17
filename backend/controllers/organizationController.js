const Organization = require('../models/Organization');
const User = require('../models/UserDetails');
const Invite = require('../models/Invite');
const emailService = require('../utils/emailService');

// Helper to generate a unique short invite code (e.g., GRACE-2024)
const generateCode = (name) => {
  const prefix = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${random}`;
};

// Create a new organization (restricted to SuperAdmins)
exports.createOrganization = async (req, res) => {
  const { name, description, isPublic, requiresApproval } = req.body;
  try {
    if (req.user.globalRole !== 'SuperAdmin') {
      return res.status(403).json({ status: 'error', message: 'Only platform SuperAdmins can create organizations' });
    }

    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Organization name is required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      return res.status(400).json({ status: 'error', message: 'An organization with a similar name already exists' });
    }

    const inviteCode = generateCode(name);

    const org = await Organization.create({
      name,
      slug,
      description: description || '',
      inviteCode,
      isPublic: isPublic !== undefined ? isPublic : false,
      requiresApproval: requiresApproval !== undefined ? requiresApproval : true,
      createdBy: req.user._id
    });

    // Add membership to user as Admin and set as active org
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        memberships: {
          organization: org._id,
          role: 'Admin',
          isActive: true
        }
      },
      $set: {
        activeOrganizationId: org._id
      }
    });

    res.status(201).json({ status: 'Ok', data: org });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get organization details
exports.getOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.orgId);
    if (!org) {
      return res.status(404).json({ status: 'error', message: 'Organization not found' });
    }
    res.json({ status: 'Ok', data: org });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Update organization details/features/guestAccess
exports.updateOrganization = async (req, res) => {
  const { name, description, isPublic, requiresApproval, features, guestAccess } = req.body;
  try {
    const org = await Organization.findById(req.orgId);
    if (!org) {
      return res.status(404).json({ status: 'error', message: 'Organization not found' });
    }

    if (name) {
      org.name = name;
      org.slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }
    if (description !== undefined) org.description = description;
    if (isPublic !== undefined) org.isPublic = isPublic;
    if (requiresApproval !== undefined) org.requiresApproval = requiresApproval;
    if (features) org.features = { ...org.features, ...features };
    if (guestAccess) org.guestAccess = { ...org.guestAccess, ...guestAccess };

    await org.save();
    res.json({ status: 'Ok', data: org });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// List all public organizations
exports.listPublicOrgs = async (req, res) => {
  try {
    const orgs = await Organization.find({ isPublic: true, isActive: true }).select('name description logoUrl slug');
    res.json({ status: 'Ok', data: orgs });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Join organization using invite code (single-use, email-linked)
exports.joinByInviteCode = async (req, res) => {
  const { inviteCode } = req.body;
  try {
    if (!inviteCode) {
      return res.status(400).json({ status: 'error', message: 'Invite code is required' });
    }

    const invite = await Invite.findOne({ code: inviteCode.trim(), isUsed: false }).populate('organization');
    if (!invite || !invite.organization || !invite.organization.isActive) {
      return res.status(404).json({ status: 'error', message: 'Invalid, used, or expired invite code' });
    }

    // Verify invite email matches the logged-in user's email
    if (invite.email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(400).json({ 
        status: 'error', 
        message: `This invite code was created specifically for ${invite.email}. Please sign in with that email to join.` 
      });
    }

    const org = invite.organization;

    // Check membership limits
    const currentMembersCount = await User.countDocuments({
      'memberships.organization': org._id
    });
    if (currentMembersCount >= (org.maxMembers || 50)) {
      return res.status(400).json({ 
        status: 'error', 
        message: `Organization membership limit of ${org.maxMembers || 50} members reached.` 
      });
    }

    // Check if user is already a member
    const isMember = req.user.memberships.some(m => m.organization.toString() === org._id.toString());
    if (isMember) {
      invite.isUsed = true;
      await invite.save();
      return res.status(400).json({ status: 'error', message: 'You are already a member of this organization' });
    }

    // Add membership and switch active org context
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        memberships: {
          organization: org._id,
          role: invite.role || 'User',
          isActive: true
        }
      },
      $set: {
        activeOrganizationId: org._id
      }
    });

    // Mark invitation as used
    invite.isUsed = true;
    await invite.save();

    res.json({ 
      status: 'Ok', 
      message: 'Successfully joined organization', 
      data: org,
      role: invite.role || 'User'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Create invitation code for user (Admin only)
exports.createInvitation = async (req, res) => {
  const { email, role } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ status: 'error', message: 'Email address is required' });
    }

    const targetRole = (role === 'Admin' || role === 'User') ? role : 'User';

    const org = await Organization.findById(req.orgId);
    if (!org) {
      return res.status(404).json({ status: 'error', message: 'Organization not found' });
    }

    // Ensure email is not already a member of this org
    const existingMember = await User.findOne({
      email: email.toLowerCase(),
      'memberships.organization': org._id
    });
    if (existingMember) {
      return res.status(400).json({ status: 'error', message: 'This user is already a member of this organization' });
    }

    // Generate unique code specifically for this invite: ORG-RANDOM
    const orgPrefix = org.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const inviteCode = `${orgPrefix}-${randomSuffix}`;

    // Create the Invite record
    const invite = await Invite.create({
      organization: org._id,
      email: email.toLowerCase().trim(),
      code: inviteCode,
      invitedBy: req.user._id,
      role: targetRole
    });

    // Send invitation email asynchronously
    emailService.sendInviteEmail(email, org.name, inviteCode, req.user.name);

    res.status(201).json({
      status: 'Ok',
      message: 'Invitation generated successfully',
      data: {
        email: invite.email,
        code: invite.code,
        expiresAt: new Date(invite.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  } catch (error) {
    console.error('Error generating invitation:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Request to join a public organization
exports.requestToJoin = async (req, res) => {
  const { orgId } = req.body;
  try {
    const org = await Organization.findOne({ _id: orgId, isPublic: true, isActive: true });
    if (!org) {
      return res.status(404).json({ status: 'error', message: 'Public organization not found' });
    }

    const isMember = req.user.memberships.some(m => m.organization.toString() === org._id.toString());
    if (isMember) {
      return res.status(400).json({ status: 'error', message: 'You are already a member of this organization' });
    }

    const currentMembersCount = await User.countDocuments({
      'memberships.organization': org._id
    });
    if (currentMembersCount >= (org.maxMembers || 50)) {
      return res.status(400).json({ 
        status: 'error', 
        message: `Organization membership limit of ${org.maxMembers || 50} members reached.` 
      });
    }

    if (req.user.pendingJoinRequests.includes(org._id)) {
      return res.status(400).json({ status: 'error', message: 'Join request already pending' });
    }

    if (org.requiresApproval) {
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { pendingJoinRequests: org._id }
      });
      res.json({ status: 'Ok', message: 'Join request submitted for admin approval' });
    } else {
      // Auto-join
      await User.findByIdAndUpdate(req.user._id, {
        $push: {
          memberships: {
            organization: org._id,
            role: 'User',
            isActive: true
          }
        },
        $set: {
          activeOrganizationId: org._id
        }
      });
      res.json({ status: 'Ok', message: 'Successfully joined organization', data: org });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Switch active organization
exports.switchActiveOrg = async (req, res) => {
  const { orgId } = req.body;
  try {
    const membership = req.user.memberships.find(m => m.organization.toString() === orgId && m.isActive);
    if (!membership) {
      return res.status(403).json({ status: 'error', message: 'You do not have an active membership with this organization' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $set: { activeOrganizationId: orgId }
    });

    res.json({ status: 'Ok', message: 'Active organization switched successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get organization members (Admin only)
exports.getOrgMembers = async (req, res) => {
  try {
    const members = await User.find({
      'memberships.organization': req.orgId,
      globalRole: { $ne: 'SuperAdmin' }
    }).select('name email mobile gender profession memberships activeOrganizationId lastActiveAt');

    const mappedMembers = members.map(m => {
      const membership = m.memberships.find(mem => mem.organization.toString() === req.orgId.toString());
      return {
        _id: m._id,
        name: m.name,
        email: m.email,
        mobile: m.mobile,
        gender: m.gender,
        profession: m.profession,
        role: membership ? membership.role : 'User',
        isActive: membership ? membership.isActive : false,
        lastActiveAt: m.lastActiveAt
      };
    });

    // Also fetch pending join requests for this org
    const pendings = await User.find({
      pendingJoinRequests: req.orgId
    }).select('name email mobile');

    res.json({
      status: 'Ok',
      data: {
        members: mappedMembers,
        pendingRequests: pendings
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Approve join request (Admin only)
exports.approveJoinRequest = async (req, res) => {
  const { userId, approve } = req.body;
  try {
    const targetUser = await User.findById(userId);
    if (!targetUser || !targetUser.pendingJoinRequests.includes(req.orgId)) {
      return res.status(404).json({ status: 'error', message: 'No pending join request found for this user' });
    }

    // Pull from pending
    await User.findByIdAndUpdate(userId, {
      $pull: { pendingJoinRequests: req.orgId }
    });

    if (approve) {
      const org = await Organization.findById(req.orgId);
      const currentMembersCount = await User.countDocuments({
        'memberships.organization': req.orgId
      });
      if (currentMembersCount >= (org.maxMembers || 50)) {
        return res.status(400).json({ 
          status: 'error', 
          message: `Cannot approve. Organization membership limit of ${org.maxMembers || 50} members reached.` 
        });
      }

      await User.findByIdAndUpdate(userId, {
        $push: {
          memberships: {
            organization: req.orgId,
            role: 'User',
            isActive: true
          }
        },
        // Auto set active if they don't have one set yet
        $set: targetUser.activeOrganizationId ? {} : { activeOrganizationId: req.orgId }
      });
      res.json({ status: 'Ok', message: 'User request approved' });
    } else {
      res.json({ status: 'Ok', message: 'User request rejected' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Remove member or change role (Admin only)
exports.updateMember = async (req, res) => {
  const { userId, role, isActive, remove } = req.body;
  try {
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ status: 'error', message: 'You cannot modify your own membership' });
    }

    if (remove) {
      await User.findByIdAndUpdate(userId, {
        $pull: { memberships: { organization: req.orgId } }
      });
      // Conditionally clear activeOrganizationId if it was the removed organization
      await User.updateOne(
        { _id: userId, activeOrganizationId: req.orgId },
        { $set: { activeOrganizationId: null } }
      );
      return res.json({ status: 'Ok', message: 'Member removed from organization' });
    }

    const updates = {};
    if (role) updates['memberships.$.role'] = role;
    if (isActive !== undefined) updates['memberships.$.isActive'] = isActive;

    await User.updateOne(
      { _id: userId, 'memberships.organization': req.orgId },
      { $set: updates }
    );

    res.json({ status: 'Ok', message: 'Member updated successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Generate new invite code
exports.regenerateInviteCode = async (req, res) => {
  try {
    const org = await Organization.findById(req.orgId);
    if (!org) {
      return res.status(404).json({ status: 'error', message: 'Organization not found' });
    }

    org.inviteCode = generateCode(org.name);
    await org.save();

    res.json({ status: 'Ok', message: 'New invite code generated', data: org.inviteCode });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
