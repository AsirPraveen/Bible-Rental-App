const Song = require("../models/Song");

exports.getSongs = async (req, res) => {
  const { search = '', topic, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  try {
    let query = { organization: req.orgId };
    if (search) {
      query.$and = [
        { organization: req.orgId },
        {
          $or: [
            { titleTamil: { $regex: search, $options: 'i' } },
            { titleEnglish: { $regex: search, $options: 'i' } },
            { lyricsTamil: { $regex: search, $options: 'i' } },
            { lyricsEnglish: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    if (topic && topic !== 'All') {
      query.topics = topic;
    }

    const songs = await Song.find(query)
      .sort({ titleTamil: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({ status: "Ok", data: songs });
  } catch (err) {
    console.error("Error fetching songs:", err);
    res.status(500).json({ status: "error", data: err.message });
  }
};

exports.getSongById = async (req, res) => {
  const { id } = req.params;
  try {
    const song = await Song.findOne({ _id: id, organization: req.orgId });
    if (!song) {
      return res.status(404).json({ status: "error", data: "Song not found in this organization" });
    }
    res.status(200).json({ status: "Ok", data: song });
  } catch (err) {
    res.status(500).json({ status: "error", data: err.message });
  }
};

exports.getSongsMetadata = async (req, res) => {
  try {
    const topics = await Song.distinct('topics', { organization: req.orgId });
    res.status(200).json({ status: "Ok", data: { topics } });
  } catch (err) {
    res.status(500).json({ status: "error", data: err.message });
  }
};

// Admin CRUD
exports.createSong = async (req, res) => {
  try {
    const { titleTamil, titleEnglish, lyricsTamil, lyricsEnglish, topics, author, youtubeLink } = req.body;
    const song = new Song({
      organization: req.orgId,
      titleTamil,
      titleEnglish,
      lyricsTamil,
      lyricsEnglish,
      topics,
      author,
      youtubeLink
    });
    await song.save();
    res.status(201).json({ status: "Ok", data: song });
  } catch (err) {
    res.status(500).json({ status: "error", data: err.message });
  }
};

exports.updateSong = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const song = await Song.findOneAndUpdate({ _id: id, organization: req.orgId }, updateData, { new: true });
    if (!song) {
        return res.status(404).json({ status: "error", data: "Song not found in this organization" });
    }
    res.status(200).json({ status: "Ok", data: song });
  } catch (err) {
    res.status(500).json({ status: "error", data: err.message });
  }
};

exports.deleteSong = async (req, res) => {
  try {
    const { id } = req.params;
    const song = await Song.findOneAndDelete({ _id: id, organization: req.orgId });
    if (!song) {
        return res.status(404).json({ status: "error", data: "Song not found in this organization" });
    }
    res.status(200).json({ status: "Ok", data: "Song deleted" });
  } catch (err) {
    res.status(500).json({ status: "error", data: err.message });
  }
};
