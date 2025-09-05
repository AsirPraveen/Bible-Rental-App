require('dotenv').config(); // Load environment variables

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/UserDetails');
const nodemailer = require('nodemailer'); // For sending emails
const { resetPasswordTemplate } = require('../config/emailTemplate');

const JWT_SECRET = process.env.JWT_SECRET; // Ensure this is set in your .env file

exports.register = async (req, res) => {
  const { name, email, mobile, password, userType, secretText } = req.body;
  try {
    console.log("inside register", req.body);
    const oldUser = await User.findOne({ email });
    if (oldUser) return res.send({ data: "User already exists!!" });

    const encryptedPassword = await bcrypt.hash(password, 10);
    
    await User.create({
      name, 
      email, 
      mobile,
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
  const { emailOrPhone, password } = req.body;
  console.log("inside login", req.body);
  
  try {
    const isPhone = /^[6-9][0-9]{9}$/.test(emailOrPhone); // tightened regex
    const query = isPhone ? { mobile: emailOrPhone } : { email: emailOrPhone };
    const oldUser = await User.findOne(query);

    console.log("oldUser:", oldUser);

    if (!oldUser) {
      console.log("User not found!");
      return res.send({ data: "User doesn't exist!!" });
    }

    const passwordMatch = await bcrypt.compare(password, oldUser.password);
    console.log("Password match?", passwordMatch);

    if (passwordMatch) {
      const token = jwt.sign({ email: oldUser.email }, JWT_SECRET);
      console.log("Token generated:", token);
      return res.status(201).send({
        status: "ok",
        data: token,
        userType: oldUser.userType
      });
    }

    console.log("Invalid password!");
    res.send({ error: "Invalid credentials!!!" });
    
  } catch (error) {
    console.error("Login error:", error);
    res.send({ "Asir": "123" });
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

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    console.log("inside forgot password", req.body);
    const user = await User.findOne({ email });
    if (!user) return res.json({ error: "User doesn't exist!!" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    await user.save();
    console.log("OTP generated:", otp);

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    console.log('Loaded Email User:', emailUser, 'Loaded Email Pass:', emailPass ? 'Set' : 'Not Set'); // Debug credentials

    if (!emailUser || !emailPass) {
      throw new Error('Email credentials are missing or not loaded from .env file');
    }

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // Verify transporter configuration
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('Transporter verification error:', error);
          reject(error);
        } else {
          console.log('Server is ready to send emails');
          resolve(success);
        }
      });
    });

    await transporter.sendMail({
      from: emailUser,
      to: email,
      subject: 'Password Reset OTP - Bible Rental App',
      // text: `Hello ${user?.name},\n\n\t\tWe have received a request to reset the password for your account associated with the email: ${email}.\n\nYour One-Time Password (OTP) is: ${otp}\nThis OTP is valid for 10 minutes. Please use it to reset your password before it expires.\n\nIf you did not request this password reset, please ignore this email or contact our support team immediately.\n\nBest regards,\nThe Bible Rental App Team\n`,
      html: resetPasswordTemplate(user?.name, otp, email)
    });

    res.json({ status: 'ok', message: 'OTP sent' });
  } catch (error) {
    console.error('Forgot Password error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.otp !== otp || Date.now() > user.otpExpiry) {
      return res.json({ error: 'Invalid or expired OTP' });
    }
    res.json({ status: 'ok', message: 'OTP verified' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ error: "User doesn't exist!!" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ status: 'ok', message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset Password error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};