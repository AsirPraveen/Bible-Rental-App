const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/Book');
const { JWT_SECRET } = require('../config/constants');

exports.registerUser = async (req, res) => {
  try {
    const { name, email, mobile, password, userType } = req.body;
    
    const oldUser = await User.findOne({ email });
    if (oldUser) {
      return res.send({ data: "User already exists!!" });
    }

    const encryptedPassword = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email,
      mobile,
      password: encryptedPassword,
      userType,
    });
    
    res.send({ status: "ok", data: "User Created" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.send({ data: "User doesn't exists!!" });
    }

    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ email: user.email }, JWT_SECRET);
      return res.status(201).send({
        status: "ok",
        data: token,
        userType: user.userType,
      });
    }
    
    res.send({ error: "Invalid credentials" });
  } catch (error) {
    res.send({ error: error.message });
  }
};

exports.getUserData = async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    res.send({ status: "Ok", data: user });
  } catch (error) {
    res.send({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, mobile, image, gender, profession } = req.body;
    await User.updateOne(
      { email },
      { $set: { name, mobile, image, gender, profession } }
    );
    res.send({ status: "Ok", data: "Updated" });
  } catch (error) {
    res.send({ error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.send({ status: "Ok", data: users });
  } catch (error) {
    res.send({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.body;
    await User.deleteOne({ _id: id });
    res.send({ status: "Ok", data: "User Deleted" });
  } catch (error) {
    res.send({ error: error.message });
  }
};