const MessageNote = require('../models/MessageNote');
const User = require('../models/UserDetails');

// Create a new note
exports.createNote = async (req, res) => {
  try {
    const { title, category, content, verse, isPublic, highlights, voiceNotes, reminders } = req.body;
    
    const newNote = new MessageNote({
      user: req.user._id,
      organization: req.orgId,
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

// Get personal notes for logged-in user in current organization
exports.getMyNotes = async (req, res) => {
  try {
    const notes = await MessageNote.find({ user: req.user._id, organization: req.orgId }).sort({ date: -1 });
    res.json({ status: 'ok', data: notes });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get public notes shared by users in current organization
exports.getPublicNotes = async (req, res) => {
  try {
    const notes = await MessageNote.find({ isPublic: true, organization: req.orgId })
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
    const note = await MessageNote.findOne({ _id: id, user: req.user._id, organization: req.orgId });

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
    const result = await MessageNote.deleteOne({ _id: id, user: req.user._id, organization: req.orgId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Note not found or unauthorized' });
    }

    res.json({ status: 'ok', message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ── Wipe ALL notes for current organization (dev/admin reset) ──────────────────────
exports.deleteAllNotes = async (req, res) => {
  try {
    if (req.user.globalRole !== 'SuperAdmin') {
      return res.status(403).json({ status: 'error', message: 'Access denied. Only platform SuperAdmins can perform this action.' });
    }
    const result = await MessageNote.deleteMany({ organization: req.orgId });
    res.json({ status: 'ok', message: `Deleted ${result.deletedCount} notes in this organization` });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
