const ReadingStat = require('../models/ReadingStat');

// POST: Sync user reading stats
exports.syncReadingStats = async (req, res) => {
  try {
    const { userId, totalChaptersRead, activePlans } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required to sync stats." });
    }

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
