const PrayerRequest = require('../models/PrayerRequest');
const FastingPlan = require('../models/FastingPlan');
const ForumQuestion = require('../models/ForumQuestion');
const ReadingStat = require('../models/ReadingStat');

// GET: High-level analytics for the Admin AppAnalyticsTab
exports.getAnalytics = async (req, res) => {
  try {
    // 1. Prayer Request Stats
    const totalPrayerRequests = await PrayerRequest.countDocuments();
    // Sum total prayed count across all requests
    const prayerAggregation = await PrayerRequest.aggregate([
      { $group: { _id: null, totalPrayersOffered: { $sum: "$prayedCount" } } }
    ]);
    const totalPrayersOffered = prayerAggregation.length > 0 ? prayerAggregation[0].totalPrayersOffered : 0;

    // 2. Fasting Tracker Stats
    const totalFasts = await FastingPlan.countDocuments();
    // Group fasts by type to see what is most popular
    const fastTypeAggregation = await FastingPlan.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 3. Discussion Forum Stats
    const totalForumQuestions = await ForumQuestion.countDocuments();
    // Sum total answers across all questions
    const forumAggregation = await ForumQuestion.aggregate([
      { $project: { answerCount: { $size: "$answers" } } },
      { $group: { _id: null, totalAnswers: { $sum: "$answerCount" } } }
    ]);
    const totalForumAnswers = forumAggregation.length > 0 ? forumAggregation[0].totalAnswers : 0;

    // 4. Reading Stats
    // Sum total chapters read and active plans across all users
    const readingAggregation = await ReadingStat.aggregate([
      { $group: { _id: null, totalChapters: { $sum: "$totalChaptersRead" }, totalActivePlans: { $sum: "$activePlans" } } }
    ]);
    const totalChaptersRead = readingAggregation.length > 0 ? readingAggregation[0].totalChapters : 0;
    const totalActiveReadingPlans = readingAggregation.length > 0 ? readingAggregation[0].totalActivePlans : 0;

    // Return the aggregated, anonymized data
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
