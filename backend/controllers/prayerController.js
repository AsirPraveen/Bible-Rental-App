const PrayerRequest = require('../models/PrayerRequest');
const { notifyUserById } = require('../utils/notificationService');

// Create a new prayer request
exports.createPrayerRequest = async (req, res) => {
  try {
    const { user, requestText, isAnonymous } = req.body;
    
    if (!user || !requestText) {
      return res.status(400).json({ status: "Error", data: 'User ID and Request text are required.' });
    }

    const newRequest = new PrayerRequest({
      user,
      requestText,
      isAnonymous
    });

    await newRequest.save();
    return res.status(201).json({ status: "Success", data: newRequest });
  } catch (error) {
    console.error('Error creating prayer request:', error);
    return res.status(500).json({ status: "Error", data: 'Server error' });
  }
};

// Get all prayer requests (latest first)
exports.getAllPrayerRequests = async (req, res) => {
  try {
    const requests = await PrayerRequest.find()
      .populate('user', 'name profilePic') // only populate specific fields
      .sort({ createdAt: -1 });

    // Handle anonymity: remove user object if anonymous
    const parsedRequests = requests.map(req => {
      let r = req.toObject();
      if (r.isAnonymous) {
        r.user = { name: 'Anonymous' };
      }
      return r;
    });

    return res.status(200).json({ status: "Success", data: parsedRequests });
  } catch (error) {
    console.error('Error fetching prayer requests:', error);
    return res.status(500).json({ status: "Error", data: 'Server error' });
  }
};

// Toggle prayed check
exports.incrementPrayedCount = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ status: "Error", data: 'User ID is required' });
    }

    const request = await PrayerRequest.findById(id);
    if (!request) {
      return res.status(404).json({ status: "Error", data: 'Prayer request not found' });
    }

    // Check if user has already prayed
    const hasPrayed = request.prayedBy.includes(userId);
    
    if (hasPrayed) {
      request.prayedBy.pull(userId);
    } else {
      request.prayedBy.push(userId);
    }

    await request.save();
    
    // Notify the requester if someone else is praying
    if (!hasPrayed && request.user && request.user.toString() !== userId) {
        await notifyUserById(
            request.user, 
            'prayerActivity', 
            'Someone is Praying for You! 🙏', 
            `A brother/sister has joined in prayer for your request: "${request.requestText.substring(0, 50)}..."`,
            { prayerId: request._id, type: 'prayer' }
        );
    }

    return res.status(200).json({ status: "Success", data: request });
  } catch (error) {
    console.error('Error incrementing prayed count:', error);
    return res.status(500).json({ status: "Error", data: 'Server error' });
  }
};
