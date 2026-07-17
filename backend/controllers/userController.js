require('dotenv').config();
const User = require('../models/UserDetails');

exports.updateUser = async (req, res) => {
  const { name, mobile, gender, profession, image } = req.body;
  try {
    const userData = req.user;

    userData.name = name || userData.name;
    userData.mobile = mobile || userData.mobile;
    userData.gender = gender || userData.gender;
    userData.profession = profession || userData.profession;
    userData.image = image || userData.image;

    await userData.save();
    res.send({ status: "Ok", data: "User updated successfully" });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const data = await User.find({ 'memberships.organization': req.orgId, globalRole: { $ne: 'SuperAdmin' } });
    res.send({ status: "Ok", data });
  } catch (error) {
    res.send({ error });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.body;
  
  try {
    // Pull organization membership instead of deleting the user's global account
    await User.updateOne(
      { _id: id },
      { $pull: { memberships: { organization: req.orgId } } }
    );
    await User.updateOne(
      { _id: id, activeOrganizationId: req.orgId },
      { $set: { activeOrganizationId: null } }
    );
    res.send({ status: "Ok", data: "User removed from this organization" });
  } catch (error) {
    res.send({ error });
  }
};

// Get user credits
exports.getUserCredits = async (req, res) => {
  try {
    res.send({ 
      status: "Ok", 
      credits: req.user.image_generation_credits_available || 0 
    });
  } catch (error) {
    console.error('Error fetching user credits:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

// Deduct credit
exports.deductCredit = async (req, res) => {
  try {
    const userData = req.user;

    if (userData.image_generation_credits_available <= 0) {
      return res.status(400).send({ 
        status: "error", 
        data: "No credits available" 
      });
    }

    userData.image_generation_credits_available -= 1;
    await userData.save();

    res.send({ 
      status: "Ok", 
      data: "Credit deducted successfully",
      remainingCredits: userData.image_generation_credits_available
    });
  } catch (error) {
    console.error('Error deducting credit:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

// Add credits (admin function)
exports.addCredits = async (req, res) => {
  const { userId, creditsToAdd } = req.body;
  
  try {
    const userData = await User.findOne({ _id: userId, 'memberships.organization': req.orgId });

    if (!userData) {
      return res.status(404).send({ status: "error", data: "User not found in this organization" });
    }

    userData.image_generation_credits_available += creditsToAdd;
    await userData.save();

    res.send({ 
      status: "Ok", 
      data: `${creditsToAdd} credits added successfully`,
      totalCredits: userData.image_generation_credits_available
    });
  } catch (error) {
    console.error('Error adding credits:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

// Reset credits for all users in this organization (admin function)
exports.resetAllCredits = async (req, res) => {
  const { creditsAmount = 5 } = req.body;
  
  try {
    await User.updateMany(
      { 'memberships.organization': req.orgId }, 
      { image_generation_credits_available: creditsAmount }
    );

    res.send({ 
      status: "Ok", 
      data: `All users' credits in this organization reset to ${creditsAmount}` 
    });
  } catch (error) {
    console.error('Error resetting credits:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

// Search users in this organization (admin function)
exports.searchUsers = async (req, res) => {
  const { query } = req.query;
  if (!query || query.length < 2) {
    return res.send({ status: "Ok", data: [] });
  }

  try {
    const users = await User.find({
      'memberships.organization': req.orgId,
      globalRole: { $ne: 'SuperAdmin' },
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).limit(10).select('name email _id');
    
    res.status(200).send({ status: "Ok", data: users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.getNotificationSettings = async (req, res) => {
  try {
    res.send({ status: "Ok", data: req.user.notificationSettings });
  } catch (error) {
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.updateNotificationSettings = async (req, res) => {
  const { settings } = req.body;
  try {
    const user = req.user;
    user.notificationSettings = { ...user.notificationSettings, ...settings };
    await user.save();

    res.send({ status: "Ok", data: "Settings updated successfully" });
  } catch (error) {
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.toggleLikedVerse = async (req, res) => {
  const { key, language, bookNumber, chapterNumber, verseNumber, text, citation } = req.body;
  try {
    const user = req.user;
    if (!user.likedVerses) user.likedVerses = [];
    const existsIndex = user.likedVerses.findIndex(v => v.key === key);
    if (existsIndex > -1) {
      user.likedVerses.splice(existsIndex, 1);
      await user.save();
      return res.send({ status: "Ok", action: "removed" });
    } else {
      user.likedVerses.push({
        key,
        language,
        bookNumber,
        chapterNumber,
        verseNumber,
        text,
        citation,
        likedAt: new Date()
      });
      await user.save();
      return res.send({ status: "Ok", action: "added" });
    }
  } catch (error) {
    console.error('Error toggling liked verse:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.toggleLikedSong = async (req, res) => {
  const { songId } = req.body;
  try {
    const user = req.user;
    const orgId = req.orgId;
    if (!user.likedSongs) user.likedSongs = [];
    const existsIndex = user.likedSongs.findIndex(
      s => s.song.toString() === songId.toString() && s.organization.toString() === orgId.toString()
    );
    if (existsIndex > -1) {
      user.likedSongs.splice(existsIndex, 1);
      await user.save();
      return res.send({ status: "Ok", action: "removed" });
    } else {
      user.likedSongs.push({
        song: songId,
        organization: orgId,
        likedAt: new Date()
      });
      await user.save();
      return res.send({ status: "Ok", action: "added" });
    }
  } catch (error) {
    console.error('Error toggling liked song:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};