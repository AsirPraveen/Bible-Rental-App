const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/UserDetails');

const JWT_SECRET = "hvdvay6ert72839289()aiyg8t87qt72393293883uhefiuh78ttq3ifi78272jdsds039[]]pou89ywe";

exports.register = async (req, res) => {
  const { name, email, mobile, password, userType, secretText } = req.body;
  try {
    console.log("inside register",req.body);
    const oldUser = await User.findOne({ email:email });
    if (oldUser) return res.send({ data: "User already exists!!" });

    const encryptedPassword = await bcrypt.hash(password, 10);
    
    await User.create({
      name, email, mobile,
      password: encryptedPassword,
      userType,
      secretText
    });
    console.log("*************")
    res.send({ status: "ok", data: "User Created" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  console.log("inside login",req.body);
  
  try {
    const oldUser = await User.findOne({ email });
    if (!oldUser) return res.send({ data: "User doesn't exists!!" });

    if (await bcrypt.compare(password, oldUser.password)) {
      const token = jwt.sign({ email: oldUser.email }, JWT_SECRET);
      return res.status(201).send({
        status: "ok",
        data: token,
        userType: oldUser.userType
      });
    }
    res.send({ error: "Invalid credentials" });
  } catch (error) {
    res.send({ error });
  }
};

exports.getUserData = async (req, res) => {
  const { token } = req.body;
  
  try {
    const user = jwt.verify(token, JWT_SECRET);
    const data = await User.findOne({ email: user.email });
    res.send({ status: "Ok", data });
  } catch (error) {
    res.send({ error });
  }
};