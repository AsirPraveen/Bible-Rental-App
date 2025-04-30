const User = require('../models/UserDetails');
const jwt = require('jsonwebtoken');

const JWT_SECRET = "hvdvay6ert72839289()aiyg8t87qt72393293883uhefiuh78ttq3ifi78272jdsds039[]]pou89ywe";
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