const mongoose = require("mongoose");
const Song = require("../models/Song");
const SongAuthor = require("../models/SongAuthor");
const SongBook = require("../models/SongBook");
const SongTopic = require("../models/SongTopic");

// Helper to serialize populated references back to string fields for frontend API contract compatibility
const serializeSong = (song) => {
  if (!song) return null;
  const doc = song.toObject ? song.toObject() : song;
  return {
    ...doc,
    author: doc.author ? (doc.author.name || doc.author) : '',
    topics: doc.topics ? doc.topics.map(t => t.name || t) : [],
    songbooks: doc.songbooks ? doc.songbooks.map(sb => sb.name || sb) : []
  };
};

// Helper for Admin/SuperAdmin to get or create normalized references
const getOrCreateAuthor = async (name) => {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  let author = await SongAuthor.findOne({ name: trimmed });
  if (!author) {
    author = new SongAuthor({ name: trimmed });
    await author.save();
  }
  return author._id;
};

const getOrCreateTopics = async (names) => {
  if (!names) return [];
  const arr = Array.isArray(names) ? names : [names];
  const ids = [];
  for (const name of arr) {
    if (typeof name !== 'string') {
      if (mongoose.isValidObjectId(name)) {
        ids.push(name);
      }
      continue;
    }
    const trimmed = name.trim();
    if (!trimmed) continue;
    let topic = await SongTopic.findOne({ name: trimmed });
    if (!topic) {
      topic = new SongTopic({ name: trimmed });
      await topic.save();
    }
    ids.push(topic._id);
  }
  return ids;
};

const getOrCreateSongbooks = async (names) => {
  if (!names) return [];
  const arr = Array.isArray(names) ? names : [names];
  const ids = [];
  for (const name of arr) {
    if (typeof name !== 'string') {
      if (mongoose.isValidObjectId(name)) {
        ids.push(name);
      }
      continue;
    }
    const trimmed = name.trim();
    if (!trimmed) continue;
    let sb = await SongBook.findOne({ name: trimmed });
    if (!sb) {
      sb = new SongBook({ name: trimmed });
      await sb.save();
    }
    ids.push(sb._id);
  }
  return ids;
};

exports.getSongs = async (req, res) => {
  const { search = '', topic, author, songbook, page, limit, scope = 'all' } = req.query;

  try {
    // Resolve blocked filters
    const [blockedTopics, blockedSongbooks, blockedAuthors] = await Promise.all([
      SongTopic.find({ allowed: false }).distinct('_id'),
      SongBook.find({ allowed: false }).distinct('_id'),
      SongAuthor.find({ allowed: false }).distinct('_id')
    ]);

    const allowedGlobalQuery = {
      isGlobal: true,
      allowed: { $ne: false },
      topics: { $nin: blockedTopics },
      songbooks: { $nin: blockedSongbooks },
      author: { $nin: blockedAuthors }
    };

    let scopeQuery = {};
    if (scope === 'global') {
      scopeQuery = allowedGlobalQuery;
    } else if (scope === 'org') {
      scopeQuery = { organizations: req.orgId };
    } else {
      scopeQuery = {
        $or: [
          allowedGlobalQuery,
          { organizations: req.orgId }
        ]
      };
    }

    let query = scopeQuery;

    if (search) {
      query = {
        $and: [
          scopeQuery,
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

    // Resolve query strings to lookup ObjectIds
    if (topic && topic !== 'All') {
      const topicDoc = await SongTopic.findOne({ name: topic });
      if (topicDoc) {
        query.topics = topicDoc._id;
      } else {
        query.topics = new mongoose.Types.ObjectId();
      }
    }

    if (songbook && songbook !== 'All') {
      const sbDoc = await SongBook.findOne({ name: songbook });
      if (sbDoc) {
        query.songbooks = sbDoc._id;
      } else {
        query.songbooks = new mongoose.Types.ObjectId();
      }
    }

    if (author && author !== 'All') {
      const authDoc = await SongAuthor.findOne({ name: author });
      if (authDoc) {
        query.author = authDoc._id;
      } else {
        query.author = new mongoose.Types.ObjectId();
      }
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

      const songs = rawSongs.map(serializeSong);
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
      // Return unpaginated (legacy support)
      const rawSongs = await Song.find(query)
        .sort({ titleEnglish: 1, titleTamil: 1 })
        .populate('author topics songbooks');

      const songs = rawSongs.map(serializeSong);
      res.status(200).json({ status: "Ok", data: songs });
    }
  } catch (err) {
    console.error("Error fetching songs:", err);
    res.status(500).json({ status: "error", data: err.message });
  }
};

exports.getSongById = async (req, res) => {
  const { id } = req.params;
  try {
    const [blockedTopics, blockedSongbooks, blockedAuthors] = await Promise.all([
      SongTopic.find({ allowed: false }).distinct('_id'),
      SongBook.find({ allowed: false }).distinct('_id'),
      SongAuthor.find({ allowed: false }).distinct('_id')
    ]);

    const allowedGlobalQuery = {
      isGlobal: true,
      allowed: { $ne: false },
      topics: { $nin: blockedTopics },
      songbooks: { $nin: blockedSongbooks },
      author: { $nin: blockedAuthors }
    };

    const song = await Song.findOne({
      _id: id,
      $or: [
        { organizations: req.orgId },
        allowedGlobalQuery
      ]
    }).populate('author topics songbooks');

    if (!song) {
      return res.status(404).json({ status: "error", data: "Song not found" });
    }

    res.status(200).json({ status: "Ok", data: serializeSong(song) });
  } catch (err) {
    res.status(500).json({ status: "error", data: err.message });
  }
};

exports.getSongsMetadata = async (req, res) => {
  try {
    const topics = await SongTopic.distinct('name', { allowed: { $ne: false } });
    const songbooks = await SongBook.distinct('name', { allowed: { $ne: false } });
    const authors = await SongAuthor.distinct('name', { allowed: { $ne: false } });

    res.status(200).json({
      status: "Ok",
      data: {
        topics: topics.sort(),
        songbooks: songbooks.sort(),
        authors: authors.sort()
      }
    });
  } catch (err) {
    res.status(500).json({ status: "error", data: err.message });
  }
};

// Admin CRUD
exports.createSong = async (req, res) => {
  try {
    const { titleTamil, titleEnglish, lyricsTamil, lyricsEnglish, topics, songbooks, author, youtubeLink } = req.body;

    const authorId = await getOrCreateAuthor(author);
    const topicIds = await getOrCreateTopics(topics);
    const songbookIds = await getOrCreateSongbooks(songbooks);

    const song = new Song({
      organizations: [req.orgId],
      isGlobal: false,
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
    res.status(201).json({ status: "Ok", data: serializeSong(populated) });
  } catch (err) {
    res.status(500).json({ status: "error", data: err.message });
  }
};

exports.updateSong = async (req, res) => {
  try {
    const { id } = req.params;
    const { titleTamil, titleEnglish, lyricsTamil, lyricsEnglish, topics, songbooks, author, youtubeLink } = req.body;

    const existingSong = await Song.findById(id);
    if (!existingSong) {
      return res.status(404).json({ status: "error", data: "Song not found" });
    }

    if (existingSong.isGlobal) {
      return res.status(403).json({ status: "error", data: "Cannot edit a global song" });
    }

    if (!existingSong.organizations || !existingSong.organizations.some(o => o.toString() === req.orgId.toString())) {
      return res.status(403).json({ status: "error", data: "Song not found in this organization context" });
    }

    const updateFields = {
      titleTamil,
      titleEnglish,
      lyricsTamil,
      lyricsEnglish,
      youtubeLink
    };

    if (author !== undefined) {
      updateFields.author = await getOrCreateAuthor(author);
    }
    if (topics !== undefined) {
      updateFields.topics = await getOrCreateTopics(topics);
    }
    if (songbooks !== undefined) {
      updateFields.songbooks = await getOrCreateSongbooks(songbooks);
    }

    const song = await Song.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    ).populate('author topics songbooks');

    res.status(200).json({ status: "Ok", data: serializeSong(song) });
  } catch (err) {
    res.status(500).json({ status: "error", data: err.message });
  }
};

exports.deleteSong = async (req, res) => {
  try {
    const { id } = req.params;
    const existingSong = await Song.findById(id);
    if (!existingSong) {
      return res.status(404).json({ status: "error", data: "Song not found" });
    }

    if (existingSong.isGlobal) {
      return res.status(403).json({ status: "error", data: "Cannot delete a global song" });
    }

    if (!existingSong.organizations || !existingSong.organizations.some(o => o.toString() === req.orgId.toString())) {
      return res.status(403).json({ status: "error", data: "Song not found in this organization context" });
    }

    await Song.findByIdAndDelete(id);
    res.status(200).json({ status: "Ok", data: "Song deleted" });
  } catch (err) {
    res.status(500).json({ status: "error", data: err.message });
  }
};

exports.toggleSongOrg = async (req, res) => {
  try {
    const { id } = req.params;
    const song = await Song.findById(id);
    if (!song) {
      return res.status(404).json({ status: "error", data: "Song not found" });
    }
    if (!song.isGlobal) {
      return res.status(400).json({ status: "error", data: "Can only toggle organization association for global songs" });
    }

    if (!song.organizations) {
      song.organizations = [];
    }

    const index = song.organizations.findIndex(o => o.toString() === req.orgId.toString());
    if (index > -1) {
      song.organizations.splice(index, 1);
      console.log(`Removed org ${req.orgId} from song ${song.titleEnglish}`);
    } else {
      song.organizations.push(req.orgId);
      console.log(`Added org ${req.orgId} to song ${song.titleEnglish}`);
    }

    await song.save();
    const populated = await Song.findById(song._id).populate('author topics songbooks');
    res.status(200).json({ status: "Ok", data: serializeSong(populated) });
  } catch (err) {
    res.status(500).json({ status: "error", data: err.message });
  }
};

// Export helpers for reuse in superAdminController
exports.serializeSong = serializeSong;
exports.getOrCreateAuthor = getOrCreateAuthor;
exports.getOrCreateTopics = getOrCreateTopics;
exports.getOrCreateSongbooks = getOrCreateSongbooks;
