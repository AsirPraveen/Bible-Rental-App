const Organization = require('../models/Organization');
const User = require('../models/UserDetails');
const Book = require('../models/Book');
const Song = require('../models/Song');
const SongAuthor = require('../models/SongAuthor');
const SongBook = require('../models/SongBook');
const SongTopic = require('../models/SongTopic');
const ForumQuestion = require('../models/ForumQuestion');
const PrayerRequest = require('../models/PrayerRequest');
const Invite = require('../models/Invite');
const emailService = require('../utils/emailService');

// GET platform analytics
exports.getPlatformAnalytics = async (req, res) => {
  try {
    const [totalOrgs, totalUsers, totalBooks, totalSongs, superAdminCount, adminCount] = await Promise.all([
      Organization.countDocuments(),
      User.countDocuments(),
      Book.countDocuments(),
      Song.countDocuments(),
      User.countDocuments({ globalRole: 'SuperAdmin' }),
      User.countDocuments({ globalRole: { $ne: 'SuperAdmin' }, 'memberships.role': 'Admin' })
    ]);
    
    const regularUserCount = totalUsers - superAdminCount - adminCount;
    
    const planBreakdown = await Organization.aggregate([
      { $group: { _id: "$plan", count: { $sum: 1 } } }
    ]);

    res.json({
      status: 'Ok',
      data: {
        totalOrganizations: totalOrgs,
        totalUsers: totalUsers,
        superAdminCount,
        adminCount,
        regularUserCount,
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
        User.countDocuments({ 'memberships.organization': org._id, globalRole: { $ne: 'SuperAdmin' } }),
        Book.countDocuments({ organization: org._id }),
        Song.countDocuments({ organizations: org._id })
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
      User.countDocuments({ 'memberships.organization': org._id, globalRole: { $ne: 'SuperAdmin' } }),
      Book.countDocuments({ organization: org._id }),
      Song.countDocuments({ organizations: org._id }),
      ForumQuestion.countDocuments({ organization: org._id }),
      PrayerRequest.countDocuments({ organization: org._id })
    ]);

    // Get members list (name, email, role — read-only)
    const members = await User.find(
      { 'memberships.organization': org._id, globalRole: { $ne: 'SuperAdmin' } },
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
  const { name, description, adminEmails } = req.body;
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

    // Parse and generate invites for initial admins
    let emails = [];
    if (Array.isArray(adminEmails)) {
      emails = adminEmails;
    } else if (typeof adminEmails === 'string') {
      emails = adminEmails.split(',').map(e => e.trim()).filter(Boolean);
    }

    const createdInvites = [];
    for (const email of emails) {
      const cleanEmail = email.toLowerCase().trim();
      if (!cleanEmail) continue;

      const orgPrefix = org.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const customInviteCode = `${orgPrefix}-${randomSuffix}`;

      const invite = await Invite.create({
        organization: org._id,
        email: cleanEmail,
        code: customInviteCode,
        invitedBy: req.user._id,
        role: 'Admin'
      });

      // Send invite email
      emailService.sendInviteEmail(cleanEmail, org.name, customInviteCode, req.user.name || 'SuperAdmin');
      createdInvites.push({ email: cleanEmail, code: customInviteCode });
    }

    res.json({ 
      status: 'Ok', 
      message: 'Organization created and initial admin invites sent successfully', 
      data: org,
      invites: createdInvites
    });
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

// GET list of all SuperAdmins
exports.listSuperAdmins = async (req, res) => {
  try {
    const superAdmins = await User.find({ globalRole: 'SuperAdmin' }).select('name email lastActiveAt');
    res.json({ status: 'Ok', data: superAdmins });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST demote a user from SuperAdmin (safeguard: cannot demote self)
exports.demoteFromSuperAdmin = async (req, res) => {
  const { email } = req.body;
  try {
    if (email.toLowerCase().trim() === req.user.email.toLowerCase().trim()) {
      return res.status(400).json({ status: 'error', message: 'You cannot demote yourself' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    user.globalRole = null;
    await user.save();

    res.json({ status: 'Ok', message: `${user.email} demoted from SuperAdmin successfully` });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const songController = require('./songController');

// GET all global songs
exports.getGlobalSongs = async (req, res) => {
  try {
    const { search = '', page, limit } = req.query;
    let query = { isGlobal: true };
    if (search) {
      query = {
        $and: [
          { isGlobal: true },
          {
            $or: [
              { titleTamil: { $regex: search, $options: 'i' } },
              { titleEnglish: { $regex: search, $options: 'i' } },
              { lyricsTamil: { $regex: search, $options: 'i' } },
              { lyricsEnglish: { $regex: search, $options: 'i' } }
            ]
          }
        ]
      };
    }

    if (page && limit) {
      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 10;
      const skip = (parsedPage - 1) * parsedLimit;

      const totalCount = await Song.countDocuments(query);
      const rawSongs = await Song.find(query)
        .sort({ titleEnglish: 1, titleTamil: 1 })
        .populate('author topics songbooks')
        .skip(skip)
        .limit(parsedLimit);

      const songs = rawSongs.map(songController.serializeSong);
      const totalPages = Math.ceil(totalCount / parsedLimit);

      res.status(200).json({
        status: "Ok",
        data: {
          songs,
          totalCount,
          totalPages
        }
      });
    } else {
      const rawSongs = await Song.find(query)
        .sort({ titleEnglish: 1, titleTamil: 1 })
        .populate('author topics songbooks');
      const songs = rawSongs.map(songController.serializeSong);
      res.status(200).json({ status: "Ok", data: songs });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// POST create global song
exports.createGlobalSong = async (req, res) => {
  try {
    const { titleTamil, titleEnglish, lyricsTamil, lyricsEnglish, topics, songbooks, author, youtubeLink } = req.body;

    const authorId = await songController.getOrCreateAuthor(author);
    const topicIds = await songController.getOrCreateTopics(topics);
    const songbookIds = await songController.getOrCreateSongbooks(songbooks);

    const song = new Song({
      organizations: [],
      isGlobal: true,
      titleTamil,
      titleEnglish,
      lyricsTamil,
      lyricsEnglish,
      topics: topicIds,
      songbooks: songbookIds,
      author: authorId,
      youtubeLink
    });

    await song.save();
    const populated = await Song.findById(song._id).populate('author topics songbooks');
    res.status(201).json({ status: "Ok", data: songController.serializeSong(populated) });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// PUT update global song
exports.updateGlobalSong = async (req, res) => {
  try {
    const { id } = req.params;
    const { titleTamil, titleEnglish, lyricsTamil, lyricsEnglish, topics, songbooks, author, youtubeLink } = req.body;

    const updateFields = {
      titleTamil,
      titleEnglish,
      lyricsTamil,
      lyricsEnglish,
      youtubeLink
    };

    if (author !== undefined) {
      updateFields.author = await songController.getOrCreateAuthor(author);
    }
    if (topics !== undefined) {
      updateFields.topics = await songController.getOrCreateTopics(topics);
    }
    if (songbooks !== undefined) {
      updateFields.songbooks = await songController.getOrCreateSongbooks(songbooks);
    }

    const song = await Song.findOneAndUpdate(
      { _id: id, isGlobal: true },
      { $set: updateFields },
      { new: true }
    ).populate('author topics songbooks');

    if (!song) {
      return res.status(404).json({ status: 'error', message: 'Global song not found' });
    }

    res.status(200).json({ status: "Ok", data: songController.serializeSong(song) });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// DELETE global song
exports.deleteGlobalSong = async (req, res) => {
  try {
    const { id } = req.params;
    const song = await Song.findOneAndDelete({ _id: id, isGlobal: true });
    if (!song) {
      return res.status(404).json({ status: 'error', message: 'Global song not found' });
    }
    res.status(200).json({ status: 'Ok', data: 'Global song deleted' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// POST toggle global song allowed status
exports.toggleGlobalSongAllowed = async (req, res) => {
  try {
    const { id } = req.params;
    const song = await Song.findById(id);
    if (!song) {
      return res.status(404).json({ status: 'error', message: 'Song not found' });
    }
    song.allowed = song.allowed === false ? true : false;
    await song.save();
    res.status(200).json({ status: 'Ok', data: songController.serializeSong(song) });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// GET all categories, songbooks, and authors (including allowed status) for SuperAdmin
exports.getFiltersMetadata = async (req, res) => {
  try {
    const topics = await SongTopic.find().sort({ name: 1 });
    const songbooks = await SongBook.find().sort({ name: 1 });
    const authors = await SongAuthor.find().sort({ name: 1 });
    res.status(200).json({
      status: 'Ok',
      data: { topics, songbooks, authors }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// POST toggle allow status for a category/topic, songbook, or author
exports.toggleFilterMetadataAllowed = async (req, res) => {
  try {
    const { type, id } = req.body;
    let model;
    if (type === 'topic') model = SongTopic;
    else if (type === 'songbook') model = SongBook;
    else if (type === 'author') model = SongAuthor;
    else return res.status(400).json({ status: 'error', message: 'Invalid filter type' });

    const doc = await model.findById(id);
    if (!doc) {
      return res.status(404).json({ status: 'error', message: 'Item not found' });
    }
    doc.allowed = doc.allowed === false ? true : false;
    await doc.save();
    res.status(200).json({ status: 'Ok', data: doc });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
