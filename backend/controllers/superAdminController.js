const Organization = require('../models/Organization');
const User = require('../models/UserDetails');
const Book = require('../models/Book');
const Song = require('../models/Song');
const ForumQuestion = require('../models/ForumQuestion');
const PrayerRequest = require('../models/PrayerRequest');

// GET platform analytics
exports.getPlatformAnalytics = async (req, res) => {
  try {
    const [totalOrgs, totalUsers, totalBooks, totalSongs] = await Promise.all([
      Organization.countDocuments(),
      User.countDocuments(),
      Book.countDocuments(),
      Song.countDocuments()
    ]);
    
    const planBreakdown = await Organization.aggregate([
      { $group: { _id: "$plan", count: { $sum: 1 } } }
    ]);

    res.json({
      status: 'Ok',
      data: {
        totalOrganizations: totalOrgs,
        totalUsers: totalUsers,
        totalBooks: totalBooks,
        totalSongs: totalSongs,
        planBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET list of all organizations with aggregate counts
exports.listAllOrganizations = async (req, res) => {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 });
    
    const mappedOrgs = await Promise.all(orgs.map(async (org) => {
      const [memberCount, bookCount, songCount] = await Promise.all([
        User.countDocuments({ 'memberships.organization': org._id }),
        Book.countDocuments({ organization: org._id }),
        Song.countDocuments({ organization: org._id })
      ]);
      return {
        ...org.toObject(),
        memberCount,
        bookCount,
        songCount
      };
    }));

    res.json({ status: 'Ok', data: mappedOrgs });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET detail for a single organization (read-only oversight)
exports.getOrgDetail = async (req, res) => {
  const { orgId } = req.params;
  try {
    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ status: 'error', message: 'Organization not found' });
    }

    // Gather all counts in parallel
    const [memberCount, bookCount, songCount, forumCount, prayerCount] = await Promise.all([
      User.countDocuments({ 'memberships.organization': org._id }),
      Book.countDocuments({ organization: org._id }),
      Song.countDocuments({ organization: org._id }),
      ForumQuestion.countDocuments({ organization: org._id }),
      PrayerRequest.countDocuments({ organization: org._id })
    ]);

    // Get members list (name, email, role — read-only)
    const members = await User.find(
      { 'memberships.organization': org._id },
      { name: 1, email: 1, image: 1, memberships: 1, lastActiveAt: 1 }
    ).lean();

    const membersList = members.map(m => {
      const membership = m.memberships.find(
        ms => ms.organization.toString() === org._id.toString()
      );
      return {
        _id: m._id,
        name: m.name || 'Unknown',
        email: m.email,
        image: m.image || null,
        role: membership?.role || 'User',
        joinedAt: membership?.joinedAt,
        isActive: membership?.isActive ?? true,
        lastActiveAt: m.lastActiveAt
      };
    });

    res.json({
      status: 'Ok',
      data: {
        organization: org.toObject(),
        stats: {
          memberCount,
          bookCount,
          songCount,
          forumCount,
          prayerCount
        },
        members: membersList
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST create a new organization
exports.createOrganization = async (req, res) => {
  const { name, description } = req.body;
  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Organization name is required' });
    }

    // Generate slug from name
    const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await Organization.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Generate invite code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomPart = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const inviteCode = `${slug.toUpperCase().slice(0, 3)}-${new Date().getFullYear()}-${randomPart}`;

    const org = await Organization.create({
      name: name.trim(),
      slug,
      description: description?.trim() || '',
      inviteCode,
      createdBy: req.user._id,
      isActive: true
    });

    res.json({ status: 'Ok', message: 'Organization created successfully', data: org });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST toggle organization status (Suspend/Reactivate)
exports.toggleOrgStatus = async (req, res) => {
  const { orgId } = req.body;
  try {
    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ status: 'error', message: 'Organization not found' });
    }

    org.isActive = !org.isActive;
    await org.save();

    res.json({ status: 'Ok', message: `Organization ${org.isActive ? 'activated' : 'suspended'} successfully`, data: org });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST promote a user to SuperAdmin
exports.promoteToSuperAdmin = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    user.globalRole = 'SuperAdmin';
    await user.save();

    res.json({ status: 'Ok', message: `${user.email} promoted to SuperAdmin successfully` });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
