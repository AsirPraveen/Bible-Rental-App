const MessageNote = require('../models/MessageNote');
const User = require('../models/UserDetails');

// Create a new note
exports.createNote = async (req, res) => {
  try {
    const { title, category, content, verse, isPublic, highlights, voiceNotes, reminders } = req.body;
    
    const newNote = new MessageNote({
      user: req.user._id,
      title,
      category,
      content,
      verse,
      isPublic,
      authorEmail: req.user.email,
      highlights,
      voiceNotes,
      reminders
    });

    const savedNote = await newNote.save();
    res.status(201).json({ status: 'ok', data: savedNote });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get personal notes for logged-in user
exports.getMyNotes = async (req, res) => {
  try {
    const notes = await MessageNote.find({ user: req.user._id }).sort({ date: -1 });
    res.json({ status: 'ok', data: notes });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get public notes shared by all users
exports.getPublicNotes = async (req, res) => {
  try {
    const notes = await MessageNote.find({ isPublic: true })
      .populate('user', 'name image') // Show author info
      .sort({ date: -1 });
    res.json({ status: 'ok', data: notes });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Update a note
exports.updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await MessageNote.findOne({ _id: id, user: req.user._id });

    if (!note) {
      return res.status(404).json({ status: 'error', message: 'Note not found or unauthorized' });
    }

    const updates = req.body;
    Object.assign(note, updates);
    note.updatedAt = Date.now();

    const updatedNote = await note.save();
    res.json({ status: 'ok', data: updatedNote });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Delete a note
exports.deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await MessageNote.deleteOne({ _id: id, user: req.user._id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Note not found or unauthorized' });
    }

    res.json({ status: 'ok', message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── Wipe ALL notes (dev/admin reset) ──────────────────────
exports.deleteAllNotes = async (req, res) => {
  try {
    const result = await MessageNote.deleteMany({});
    res.json({ status: 'ok', message: `Deleted ${result.deletedCount} notes` });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

