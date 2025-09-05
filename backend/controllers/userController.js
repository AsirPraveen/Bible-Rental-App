require('dotenv').config();
const User = require('../models/UserDetails');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

exports.updateUser = async (req, res) => {
  const { token, name, mobile, gender, profession, image } = req.body;
  console.log(req.body);
  try {
    const user = jwt.verify(token, JWT_SECRET);
    const userData = await User.findOne({ email: user.email });

    if (!userData) {
      return res.status(404).send({ status: "error", data: "User not found" });
    }

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
    const data = await User.find({});
    res.send({ status: "Ok", data });
  } catch (error) {
    res.send({ error });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.body;
  
  try {
    await User.deleteOne({ _id: id });
    res.send({ status: "Ok", data: "User Deleted" });
  } catch (error) {
    res.send({ error });
  }
};

// New function to get user credits
exports.getUserCredits = async (req, res) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).send({ status: "error", data: "No token provided" });
    }

    const user = jwt.verify(token, JWT_SECRET);
    const userData = await User.findOne({ email: user.email });

    if (!userData) {
      return res.status(404).send({ status: "error", data: "User not found" });
    }

    res.send({ 
      status: "Ok", 
      credits: userData.image_generation_credits_available || 0 
    });
  } catch (error) {
    console.error('Error fetching user credits:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

// New function to deduct credit
exports.deductCredit = async (req, res) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).send({ status: "error", data: "No token provided" });
    }

    const user = jwt.verify(token, JWT_SECRET);
    const userData = await User.findOne({ email: user.email });

    if (!userData) {
      return res.status(404).send({ status: "error", data: "User not found" });
    }

    // Check if user has credits
    if (userData.image_generation_credits_available <= 0) {
      return res.status(400).send({ 
        status: "error", 
        data: "No credits available" 
      });
    }

    // Deduct one credit
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

// New function to add credits (admin function)
exports.addCredits = async (req, res) => {
  const { userId, creditsToAdd } = req.body;
  
  try {
    const userData = await User.findById(userId);

    if (!userData) {
      return res.status(404).send({ status: "error", data: "User not found" });
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

// New function to reset credits for all users (admin function)
exports.resetAllCredits = async (req, res) => {
  const { creditsAmount = 5 } = req.body;
  
  try {
    await User.updateMany({}, { 
      image_generation_credits_available: creditsAmount 
    });

    res.send({ 
      status: "Ok", 
      data: `All users' credits reset to ${creditsAmount}` 
    });
  } catch (error) {
    console.error('Error resetting credits:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};