const FastingPlan = require('../models/FastingPlan');

// Start a new fast
exports.createFastingPlan = async (req, res) => {
  try {
    const { user, startDate, endDate, type, notes, notifyInterval } = req.body;

    if (!user || !startDate || !endDate) {
      return res.status(400).json({ status: "Error", data: 'User ID, start date, and end date are required.' });
    }

    const newFast = new FastingPlan({
      organization: req.orgId,
      user,
      startDate,
      endDate,
      type: type === 'Others' ? req.body.customType : type,
      notes,
      notifyInterval
    });

    await newFast.save();
    return res.status(201).json({ status: "Success", data: newFast });
  } catch (error) {
    console.error('Error creating fasting plan:', error);
    return res.status(500).json({ status: "Error", data: 'Server error' });
  }
};

// Get fasting plans for a specific user within this organization
exports.getUserFastingPlans = async (req, res) => {
  try {
    const { userId } = req.params;
    const plans = await FastingPlan.find({ user: userId, organization: req.orgId }).sort({ createdAt: -1 });
    
    return res.status(200).json({ status: "Success", data: plans });
  } catch (error) {
    console.error('Error fetching fasting plans:', error);
    return res.status(500).json({ status: "Error", data: 'Server error' });
  }
};

// Update fast status
exports.updateFastingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Completed', 'Broken'].includes(status)) {
        return res.status(400).json({ status: "Error", data: 'Invalid status' });
    }

    const plan = await FastingPlan.findOneAndUpdate(
      { _id: id, organization: req.orgId },
      { status },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ status: "Error", data: 'Fasting plan not found' });
    }

    return res.status(200).json({ status: "Success", data: plan });
  } catch (error) {
    console.error('Error updating fasting plan:', error);
    return res.status(500).json({ status: "Error", data: 'Server error' });
  }
};
