const ReadingStat = require('../models/ReadingStat');

// POST: Sync user reading stats
exports.syncReadingStats = async (req, res) => {
  try {
    const { totalChaptersRead, activePlans } = req.body;

    // Always sync the authenticated caller's own stats — never a body-supplied id.
    const userId = req.user._id;

    // Upsert the stats for the user
    const stats = await ReadingStat.findOneAndUpdate(
      { user: userId },
      { 
        totalChaptersRead: totalChaptersRead,
        activePlans: activePlans,
        lastSynced: Date.now()
      },
      { new: true, upsert: true }
    );

    res.status(200).json({ status: "ok", data: stats });
  } catch (error) {
    console.error("Error syncing reading stats:", error);
    res.status(500).json({ error: "Internal server error syncing stats." });
  }
};
