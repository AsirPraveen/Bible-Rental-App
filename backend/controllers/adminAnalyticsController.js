const PrayerRequest = require('../models/PrayerRequest');
const FastingPlan = require('../models/FastingPlan');
const ForumQuestion = require('../models/ForumQuestion');
const ReadingStat = require('../models/ReadingStat');
const User = require('../models/UserDetails');

// GET: High-level analytics for the Admin AppAnalyticsTab
exports.getAnalytics = async (req, res) => {
  try {
    // Get all member IDs of this organization for user-scoped collections
    const members = await User.find({ 'memberships.organization': req.orgId }).select('_id');
    const memberIds = members.map(m => m._id);

    // 1. Prayer Request Stats
    const totalPrayerRequests = await PrayerRequest.countDocuments({ organization: req.orgId });
    const prayerAggregation = await PrayerRequest.aggregate([
      { $match: { organization: req.orgId } },
      { $group: { _id: null, totalPrayersOffered: { $sum: { $size: "$prayedBy" } } } }
    ]);
    const totalPrayersOffered = prayerAggregation.length > 0 ? prayerAggregation[0].totalPrayersOffered : 0;

    // 2. Fasting Tracker Stats
    const totalFasts = await FastingPlan.countDocuments({ organization: req.orgId });
    const fastTypeAggregation = await FastingPlan.aggregate([
      { $match: { organization: req.orgId } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 3. Discussion Forum Stats
    const totalForumQuestions = await ForumQuestion.countDocuments({ organization: req.orgId });
    const forumAggregation = await ForumQuestion.aggregate([
      { $match: { organization: req.orgId } },
      { $project: { answerCount: { $size: "$answers" } } },
      { $group: { _id: null, totalAnswers: { $sum: "$answerCount" } } }
    ]);
    const totalForumAnswers = forumAggregation.length > 0 ? forumAggregation[0].totalAnswers : 0;

    // 4. Reading Stats
    const readingAggregation = await ReadingStat.aggregate([
      { $match: { user: { $in: memberIds } } },
      { $group: { _id: null, totalChapters: { $sum: "$totalChaptersRead" }, totalActivePlans: { $sum: "$activePlans" } } }
    ]);
    const totalChaptersRead = readingAggregation.length > 0 ? readingAggregation[0].totalChapters : 0;
    const totalActiveReadingPlans = readingAggregation.length > 0 ? readingAggregation[0].totalActivePlans : 0;

    const analyticsData = {
      prayers: {
        totalRequests: totalPrayerRequests,
        totalPrayersOffered: totalPrayersOffered
      },
      fasting: {
        totalFasts: totalFasts,
        popularTypes: fastTypeAggregation
      },
      forum: {
        totalQuestions: totalForumQuestions,
        totalAnswers: totalForumAnswers
      },
      reading: {
        totalChaptersRead: totalChaptersRead,
        totalActivePlans: totalActiveReadingPlans
      }
    };

    res.status(200).json({ status: "ok", data: analyticsData });

  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    res.status(500).json({ error: "Internal server error fetching analytics." });
  }
};
