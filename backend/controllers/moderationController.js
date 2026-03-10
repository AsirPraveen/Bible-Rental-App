const PrayerRequest = require('../models/PrayerRequest');
const ForumQuestion = require('../models/ForumQuestion');

// ===================================
// PRAYER REQUEST MODERATION
// ===================================

// GET: Fetch all prayer requests stripped of user identities
exports.getPrayerRequestsForModeration = async (req, res) => {
  try {
    // We populate 'user' to get the name for moderation display.
    const requests = await PrayerRequest.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .select('requestText createdAt prayedCount user isAnonymous');
    
    // Map to ensure we always have a name field, even if anonymous
    const sanitizedRequests = requests.map(req => ({
      ...req.toObject(),
      userName: req.isAnonymous ? 'Anonymous' : (req.user?.name || 'Unknown User')
    }));

    return res.status(200).json({ status: "ok", data: sanitizedRequests });
  } catch (error) {
    console.error('Error fetching prayer requests for moderation:', error);
    return res.status(500).json({ error: 'Server error fetching moderation data' });
  }
};

// DELETE: Remove a prayer request
exports.deletePrayerRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PrayerRequest.findByIdAndDelete(id);
    
    if (!deleted) return res.status(404).json({ error: 'Prayer request not found' });
    
    return res.status(200).json({ status: "ok", message: "Prayer request deleted successfully" });
  } catch (error) {
    console.error('Error deleting prayer request:', error);
    return res.status(500).json({ error: 'Server error deleting prayer request' });
  }
};

// ===================================
// FORUM MODERATION
// ===================================

// GET: Fetch all forum questions stripped of user identities
exports.getForumQuestionsForModeration = async (req, res) => {
  try {
    // We populate 'user' to get the name for moderation display.
    const questions = await ForumQuestion.find()
      .populate('user', 'name')
      .populate('answers.user', 'name')
      .sort({ createdAt: -1 })
      .select('questionText createdAt answers user isAnonymous');
    
    // Map to include user names for both the question and answers
    const sanitizedQuestions = questions.map(q => ({
      _id: q._id,
      questionText: q.questionText,
      createdAt: q.createdAt,
      userName: q.isAnonymous ? 'Anonymous' : (q.user?.name || 'Unknown User'),
      answerCount: q.answers ? q.answers.length : 0,
      answers: q.answers ? q.answers.map(a => ({
        _id: a._id,
        answerText: a.answerText,
        createdAt: a.createdAt,
        userName: a.user?.name || 'Unknown User'
      })) : []
    }));

    return res.status(200).json({ status: "ok", data: sanitizedQuestions });
  } catch (error) {
    console.error('Error fetching forum questions for moderation:', error);
    return res.status(500).json({ error: 'Server error fetching moderation data' });
  }
};

// DELETE: Remove a forum question
exports.deleteForumQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ForumQuestion.findByIdAndDelete(id);
    
    if (!deleted) return res.status(404).json({ error: 'Forum question not found' });
    
    return res.status(200).json({ status: "ok", message: "Forum question deleted successfully" });
  } catch (error) {
    console.error('Error deleting forum question:', error);
    return res.status(500).json({ error: 'Server error deleting forum question' });
  }
};
