const Fellowship = require('../models/Fellowship');
const Message = require('../models/Message');
const User = require('../models/UserDetails');

// ─── CREATE FELLOWSHIP ──────────────────────────────────────────────
// POST /api/fellowships
// Body: { name, description?, icon?, type?, memberIds? }
// Requires: Admin or Shepherd role in org
const createFellowship = async (req, res) => {
  try {
    const { name, description, icon, type, memberIds } = req.body;
    const orgId = req.orgId;
    const creatorId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Fellowship name is required.' });
    }

    // Build members array — creator is always a shepherd
    const members = [{ user: creatorId, role: 'shepherd', joinedAt: new Date() }];

    // Add selected members (if any)
    if (memberIds && Array.isArray(memberIds)) {
      for (const uid of memberIds) {
        if (uid.toString() !== creatorId.toString()) {
          members.push({ user: uid, role: 'member', joinedAt: new Date() });
        }
      }
    }

    const fellowship = await Fellowship.create({
      name: name.trim(),
      description: description || '',
      icon: icon || '📖',
      type: type || 'normal',
      organization: orgId,
      createdBy: creatorId,
      members
    });

    // Create a system message for the fellowship creation
    await Message.create({
      fellowship: fellowship._id,
      sender: creatorId,
      senderName: req.user.name,
      text: `${req.user.name} gathered this fellowship.`,
      type: 'system'
    });

    // Populate for response
    const populated = await Fellowship.findById(fellowship._id)
      .populate('members.user', 'name email image')
      .populate('createdBy', 'name email image');

    return res.status(201).json({ status: 'Ok', data: populated });
  } catch (error) {
    console.error('createFellowship error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── GET USER'S FELLOWSHIPS ─────────────────────────────────────────
// GET /api/fellowships
// Returns all non-archived fellowships the user is a member of (org-scoped)
const getFellowships = async (req, res) => {
  try {
    const orgId = req.orgId;
    const userId = req.user._id;

    const fellowships = await Fellowship.find({
      organization: orgId,
      isArchived: false,
      'members.user': userId
    })
      .populate('members.user', 'name email image')
      .populate('lastMessage.sender', 'name')
      .sort({ 'lastMessage.sentAt': -1, createdAt: -1 });

    // Calculate unread counts for each fellowship
    const results = await Promise.all(
      fellowships.map(async (f) => {
        const unreadCount = await Message.countDocuments({
          fellowship: f._id,
          readBy: { $ne: userId },
          sender: { $ne: userId },
          isDeleted: false
        });
        return { ...f.toObject(), unreadCount };
      })
    );

    return res.json({ status: 'Ok', data: results });
  } catch (error) {
    console.error('getFellowships error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── GET FELLOWSHIP DETAILS ─────────────────────────────────────────
// GET /api/fellowships/:id
const getFellowshipDetails = async (req, res) => {
  try {
    const fellowship = await Fellowship.findOne({ _id: req.params.id, organization: req.orgId })
      .populate('members.user', 'name email image')
      .populate('createdBy', 'name email image');

    if (!fellowship) {
      return res.status(404).json({ status: 'error', message: 'Fellowship not found.' });
    }

    // Check membership (Org admins can view details of any fellowship)
    const isMember = fellowship.members.some(
      m => m.user && (m.user._id || m.user).toString() === req.user._id.toString()
    );
    if (!isMember && req.orgRole !== 'Admin') {
      return res.status(403).json({ status: 'error', message: 'You are not a member of this fellowship.' });
    }

    return res.json({ status: 'Ok', data: fellowship });
  } catch (error) {
    console.error('getFellowshipDetails error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── UPDATE FELLOWSHIP ──────────────────────────────────────────────
// PUT /api/fellowships/:id
// Body: { name?, description?, icon?, type? }
// Requires shepherd role in the fellowship or org admin
const updateFellowship = async (req, res) => {
  try {
    // Scoped to the caller's org: the admin fallback below must mean
    // "admin of THIS organization", not "admin of any organization".
    const fellowship = await Fellowship.findOne({ _id: req.params.id, organization: req.orgId });
    if (!fellowship) {
      return res.status(404).json({ status: 'error', message: 'Fellowship not found.' });
    }

    // Check if user is shepherd or org admin
    const isShepherd = fellowship.members.some(
      m => m.user && (m.user._id || m.user).toString() === req.user._id.toString() && m.role === 'shepherd'
    );
    if (!isShepherd && req.orgRole !== 'Admin') {
      return res.status(403).json({ status: 'error', message: 'Only shepherds can update this fellowship.' });
    }

    const { name, description, icon, type } = req.body;
    if (name !== undefined) fellowship.name = name.trim();
    if (description !== undefined) fellowship.description = description;
    if (icon !== undefined) fellowship.icon = icon;
    if (type !== undefined && ['normal', 'announcement'].includes(type)) {
      const oldType = fellowship.type;
      fellowship.type = type;

      // Create system message about type change
      if (oldType !== type) {
        const typeLabel = type === 'announcement' ? 'announcement-only' : 'open for all';
        await Message.create({
          fellowship: fellowship._id,
          sender: req.user._id,
          senderName: req.user.name,
          text: `${req.user.name} changed this fellowship to ${typeLabel}.`,
          type: 'system'
        });
      }
    }

    await fellowship.save();

    const populated = await Fellowship.findById(fellowship._id)
      .populate('members.user', 'name email image')
      .populate('createdBy', 'name email image');

    return res.json({ status: 'Ok', data: populated });
  } catch (error) {
    console.error('updateFellowship error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── ARCHIVE FELLOWSHIP ─────────────────────────────────────────────
// PATCH /api/fellowships/:id/archive
const archiveFellowship = async (req, res) => {
  try {
    // Scoped to the caller's org: the admin fallback below must mean
    // "admin of THIS organization", not "admin of any organization".
    const fellowship = await Fellowship.findOne({ _id: req.params.id, organization: req.orgId });
    if (!fellowship) {
      return res.status(404).json({ status: 'error', message: 'Fellowship not found.' });
    }

    const isShepherd = fellowship.members.some(
      m => m.user && (m.user._id || m.user).toString() === req.user._id.toString() && m.role === 'shepherd'
    );
    if (!isShepherd && req.orgRole !== 'Admin') {
      return res.status(403).json({ status: 'error', message: 'Only shepherds can archive this fellowship.' });
    }

    fellowship.isArchived = !fellowship.isArchived;
    await fellowship.save();

    return res.json({
      status: 'Ok',
      message: fellowship.isArchived ? 'Fellowship archived.' : 'Fellowship restored.',
      data: fellowship
    });
  } catch (error) {
    console.error('archiveFellowship error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── ADD MEMBERS ─────────────────────────────────────────────────────
// POST /api/fellowships/:id/members
// Body: { userIds: [ObjectId], role?: 'shepherd'|'member' }
const addMembers = async (req, res) => {
  try {
    // Scoped to the caller's org: the admin fallback below must mean
    // "admin of THIS organization", not "admin of any organization".
    const fellowship = await Fellowship.findOne({ _id: req.params.id, organization: req.orgId });
    if (!fellowship) {
      return res.status(404).json({ status: 'error', message: 'Fellowship not found.' });
    }

    const isShepherd = fellowship.members.some(
      m => m.user && (m.user._id || m.user).toString() === req.user._id.toString() && m.role === 'shepherd'
    );
    if (!isShepherd && req.orgRole !== 'Admin') {
      return res.status(403).json({ status: 'error', message: 'Only shepherds can add members.' });
    }

    const { userIds, role } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ status: 'error', message: 'userIds array is required.' });
    }

    // Only people who belong to this organization can be added to its fellowships.
    const eligible = await User.find({
      _id: { $in: userIds },
      memberships: { $elemMatch: { organization: req.orgId, isActive: true } }
    }).select('_id');
    const eligibleIds = new Set(eligible.map(u => u._id.toString()));

    const existingIds = fellowship.members.map(m => m.user.toString());
    const newMembers = [];
    const addedNames = [];

    for (const uid of userIds) {
      if (!eligibleIds.has(uid.toString())) continue;
      if (!existingIds.includes(uid.toString())) {
        fellowship.members.push({
          user: uid,
          role: role || 'member',
          joinedAt: new Date()
        });
        newMembers.push(uid);
        const u = await User.findById(uid).select('name');
        if (u) addedNames.push(u.name);
      }
    }

    if (newMembers.length > 0) {
      await fellowship.save();

      // System message
      await Message.create({
        fellowship: fellowship._id,
        sender: req.user._id,
        senderName: req.user.name,
        text: `${req.user.name} added ${addedNames.join(', ')} to the fellowship.`,
        type: 'system'
      });
    }

    const populated = await Fellowship.findById(fellowship._id)
      .populate('members.user', 'name email image');

    return res.json({ status: 'Ok', data: populated });
  } catch (error) {
    console.error('addMembers error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── REMOVE MEMBER ───────────────────────────────────────────────────
// DELETE /api/fellowships/:id/members/:userId
const removeMember = async (req, res) => {
  try {
    // Scoped to the caller's org: the admin fallback below must mean
    // "admin of THIS organization", not "admin of any organization".
    const fellowship = await Fellowship.findOne({ _id: req.params.id, organization: req.orgId });
    if (!fellowship) {
      return res.status(404).json({ status: 'error', message: 'Fellowship not found.' });
    }

    const targetUserId = req.params.userId;
    const requesterId = req.user._id.toString();

    // User can leave on their own, or shepherd/admin can remove
    const isSelfLeave = targetUserId === requesterId;
    const isShepherd = fellowship.members.some(
      m => m.user && (m.user._id || m.user).toString() === requesterId && m.role === 'shepherd'
    );

    if (!isSelfLeave && !isShepherd && req.orgRole !== 'Admin') {
      return res.status(403).json({ status: 'error', message: 'Only shepherds can remove members.' });
    }

    const removedUser = await User.findById(targetUserId).select('name');
    fellowship.members = fellowship.members.filter(
      m => m.user && (m.user._id || m.user).toString() !== targetUserId
    );
    await fellowship.save();

    // System message
    const actionText = isSelfLeave ? 'left' : 'was removed from';
    await Message.create({
      fellowship: fellowship._id,
      sender: req.user._id,
      senderName: req.user.name,
      text: `${removedUser?.name || 'A member'} ${actionText} the fellowship.`,
      type: 'system'
    });

    return res.json({ status: 'Ok', message: 'Member removed.' });
  } catch (error) {
    console.error('removeMember error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── GET MESSAGES (PAGINATED) ────────────────────────────────────────
// GET /api/fellowships/:id/messages?page=1&limit=50
const getMessages = async (req, res) => {
  try {
    // Scoped to the caller's org: the admin fallback below must mean
    // "admin of THIS organization", not "admin of any organization".
    const fellowship = await Fellowship.findOne({ _id: req.params.id, organization: req.orgId });
    if (!fellowship) {
      return res.status(404).json({ status: 'error', message: 'Fellowship not found.' });
    }

    // Verify membership (Org admins can view messages for any fellowship)
    const isMember = fellowship.members.some(
      m => m.user && (m.user._id || m.user).toString() === req.user._id.toString()
    );
    if (!isMember && req.orgRole !== 'Admin') {
      return res.status(403).json({ status: 'error', message: 'You are not a member of this fellowship.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({ fellowship: req.params.id, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name email image'),
      Message.countDocuments({ fellowship: req.params.id, isDeleted: false })
    ]);

    // Mark messages as read by this user
    const messageIds = messages
      .filter(m => !m.readBy.includes(req.user._id))
      .map(m => m._id);

    if (messageIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $addToSet: { readBy: req.user._id } }
      );
    }

    return res.json({
      status: 'Ok',
      data: messages.reverse(), // Return chronological order
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + limit < total
      }
    });
  } catch (error) {
    console.error('getMessages error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── GET ORG MEMBERS FOR SELECTION ───────────────────────────────────
// GET /api/fellowships/org-members
// Returns all org members for the member picker when creating a fellowship
const getOrgMembersForPicker = async (req, res) => {
  try {
    const orgId = req.orgId;

    const members = await User.find({
      'memberships.organization': orgId,
      'memberships.isActive': true,
      globalRole: { $ne: 'SuperAdmin' }
    }).select('name email image memberships');

    // Filter to active memberships for this org only
    const result = members.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.memberships.find(m => m.organization.toString() === orgId.toString())?.role || 'User'
    }));

    return res.json({ status: 'Ok', data: result });
  } catch (error) {
    console.error('getOrgMembersForPicker error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── GET Q&A ANSWERS (SECURED) ───────────────────────────────────────
// GET /api/fellowships/:id/messages/:messageId/answers
const getQnaAnswers = async (req, res) => {
  try {
    const fellowshipId = req.params.id;
    const messageId = req.params.messageId;
    const userId = req.user._id;

    const fellowship = await Fellowship.findOne({ _id: fellowshipId, organization: req.orgId });
    if (!fellowship) {
      return res.status(404).json({ status: 'error', message: 'Fellowship not found.' });
    }

    const member = fellowship.members.find(
      m => m.user && m.user.toString() === userId.toString()
    );
    const isOrgAdmin = req.orgRole === 'Admin';
    if (!member && !isOrgAdmin) {
      return res.status(403).json({ status: 'error', message: 'You are not a member of this fellowship.' });
    }

    const message = await Message.findOne({ _id: messageId, fellowship: fellowshipId });
    if (!message || message.type !== 'qna' || !message.qnaData) {
      return res.status(404).json({ status: 'error', message: 'Q&A message not found.' });
    }

    const isShepherdOrAdmin = (member && member.role === 'shepherd') || isOrgAdmin;
    const isAnswerVisibleToAll = message.qnaData.isAnswerVisibleToAll;
    const answers = message.qnaData.answers || [];

    if (isAnswerVisibleToAll || isShepherdOrAdmin) {
      return res.json({ status: 'Ok', data: answers });
    }

    const myAnswer = answers.filter(
      a => a.user && a.user.toString() === userId.toString()
    );

    return res.json({ status: 'Ok', data: myAnswer });
  } catch (error) {
    console.error('getQnaAnswers error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = {
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
};
