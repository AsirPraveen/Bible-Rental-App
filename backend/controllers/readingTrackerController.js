const User = require('../models/UserDetails');
const ReadingStat = require('../models/ReadingStat');

exports.syncReadingProgress = async (req, res) => {
  try {
    const { userId, readingProgress, treasuresInHeaven, totalChaptersRead, planProgress } = req.body;

    if (!userId) {
      return res.status(400).json({ status: 'Error', message: 'User ID is required' });
    }

    // Update User details with full mapping and treasures
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          readingProgress: readingProgress || {},
          treasuresInHeaven: treasuresInHeaven !== undefined ? treasuresInHeaven : 0
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ status: 'Error', message: 'User not found' });
    }

    // Also update the ReadingStat for admin analytics if provided
    if (totalChaptersRead !== undefined) {
      await ReadingStat.findOneAndUpdate(
        { user: userId },
        { 
          $set: { 
            totalChaptersRead: totalChaptersRead,
            planProgress: planProgress || [],
            lastSynced: Date.now()
          } 
        },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ 
      status: 'Ok', 
      data: { 
        treasuresInHeaven: user.treasuresInHeaven, 
        readingProgress: user.readingProgress 
      } 
    });
  } catch (error) {
    console.error('Error syncing reading progress:', error);
    res.status(500).json({ status: 'Error', message: 'Failed to sync reading progress' });
  }
};
