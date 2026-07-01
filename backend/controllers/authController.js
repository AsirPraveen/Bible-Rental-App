require('dotenv').config();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/UserDetails');
const Book = require('../models/Book');
const nodemailer = require('nodemailer');
const { resetPasswordTemplate } = require('../config/emailTemplate');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
  const { name, email, mobile, password, userType, secretText } = req.body;
  try {
    console.log("inside register", req.body);
    const oldUser = await User.findOne({ email });
    if (oldUser) return res.status(409).send({ status: "error", data: "User already exists!!" });

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
      const token = jwt.sign({ email: oldUser.email }, JWT_SECRET, { expiresIn: '30d' });
      console.log("Token generated:", token);
      return res.status(201).send({
        status: "ok",
        data: token,
        userType: oldUser.userType
      });
    }

    console.log("Invalid password!");
    res.status(401).send({ status: "error", data: "Invalid credentials" });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send({ status: "error", data: "An error occurred during login" });
  }
};


exports.getUserData = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.send({ status: "error", data: "Token missing" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Use .lean() to get a plain JS object that we can modify
    const user = await User.findOne({ email: decoded.email }).lean();

    if (!user) {
      return res.status(404).send({ status: "error", message: "User not found" });
    }

    // Populate book names for rented books if they exist
    if (user.books_rented && user.books_rented.length > 0) {
      const bookIds = user.books_rented.map(r => r.book_id);
      const books = await Book.find({ book_id: { $in: bookIds } }).select('book_id book_name');
      const bookMap = new Map(books.map(b => [b.book_id, b.book_name]));

      user.books_rented = user.books_rented.map(r => ({
        ...r,
        book_name: bookMap.get(r.book_id) || 'Unknown Book'
      }));
    }

    res.send({ status: "Ok", data: user });
  } catch (error) {
    console.error('Error in getUserData:', error.message);
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.send({ status: "error", data: "token expired" });
    }
    res.status(500).send({ error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    console.log('forgot-password request:', email);
    const user = await User.findOne({ email });
    if (!user) return res.json({ error: 'No account found with this email address.' });

    // Generate & save OTP before attempting email (so we know it's ready)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();
    console.log('OTP generated:', otp);

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      console.error('EMAIL_USER or EMAIL_PASS missing from backend .env');
      return res.status(500).json({ error: 'Email service is not configured on the server.' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: emailUser, pass: emailPass },
      tls: { rejectUnauthorized: false },
    });

    // ── Verify SMTP connection BEFORE trying to send ──────────────────────────
    try {
      await transporter.verify();
      console.log('SMTP connection verified OK');
    } catch (verifyErr) {
      console.error('SMTP verify failed:', verifyErr.code, verifyErr.message);
      if (verifyErr.code === 'EAUTH') {
        return res.status(500).json({
          error:
            'Gmail App Password is invalid or expired. ' +
            'Go to myaccount.google.com → Security → App Passwords, ' +
            'generate a new password and update EMAIL_PASS in backend/.env',
        });
      }
      return res.status(500).json({
        error: `Cannot reach email server (${verifyErr.code || verifyErr.message}). Check server internet connection.`,
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    await transporter.sendMail({
      from: `"Bible Rental App" <${emailUser}>`,
      to: email,
      subject: 'Password Reset OTP - Bible Rental App',
      html: resetPasswordTemplate(user?.name, otp, email),
    });

    console.log(`OTP email sent to ${email}`);
    res.json({ status: 'ok', message: `OTP sent to ${email}.` });

  } catch (error) {
    console.error('Forgot Password error:', error);
    res.status(500).json({ error: error.message || 'Failed to send OTP. Please try again.' });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.otp !== otp || Date.now() > user.otpExpiry) {
      return res.status(400).json({ status: 'error', data: 'Invalid or expired OTP' });
    }
    // Mark OTP as verified by setting a short-lived reset window
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min window to reset
    await user.save();
    res.json({ status: 'ok', message: 'OTP verified' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ status: 'error', data: error.message || 'Internal server error' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ status: 'error', data: "User doesn't exist" });

    // Ensure user went through OTP verification (has a valid reset window)
    if (!user.resetPasswordExpires || Date.now() > user.resetPasswordExpires) {
      return res.status(400).json({ status: 'error', data: 'Password reset session expired. Please request a new OTP.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ status: 'ok', message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset Password error:', error);
    res.status(500).json({ status: 'error', data: error.message || 'Internal server error' });
  }
};

exports.updatePushToken = async (req, res) => {
  const { token, expoPushToken } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).send({ status: "error", message: "User not found" });
    }

    user.expoPushToken = expoPushToken;
    await user.save();

    res.send({ status: "Ok", message: "Push token updated successfully" });
  } catch (error) {
    console.error('Error updating push token:', error);
    res.status(500).send({ status: "error", message: error.message });
  }
};

// Google Sign-In: check if user exists — do NOT create new users here
// (deferred to googleSetPassword to prevent orphan accounts)
exports.googleLogin = async (req, res) => {
  const { googleId, email, name, photoUrl } = req.body;
  try {
    if (!email || !googleId) {
      return res.status(400).json({ error: 'Missing required Google credentials' });
    }

    // Try to find existing user by email
    let user = await User.findOne({ email });

    if (!user) {
      // New user — DON'T create yet. Let them set a password first.
      console.log('New Google user detected (not created yet):', email);
      return res.status(200).json({
        status: 'ok',
        isNewUser: true,
        // No token — they need to set a password first
      });
    }

    // Existing user — log them in
    console.log('Existing Google user logged in:', email);
    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    return res.status(200).json({
      status: 'ok',
      data: token,
      userType: user.userType,
      isNewUser: false,
      userData: { name: user.name, email: user.email, image: user.image }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: error.message || 'Google login failed' });
  }
};

// Create account + set password for a new Google user (or update existing)
exports.googleSetPassword = async (req, res) => {
  const { email, newPassword, name, googleId, image } = req.body;
  try {
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Create the user now (deferred from googleLogin)
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        mobile: '',
        password: await bcrypt.hash(newPassword, 10),
        userType: 'User',
        image: image || '',
        secretText: '',
        googleId: googleId || '',
      });
      console.log('Google user created with password:', email);
    } else {
      // User already exists (edge case: they came back) — just update password
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      console.log('Google user password updated:', email);
    }

    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      status: 'ok',
      message: 'Account created successfully',
      data: token,
      userType: user.userType,
      userData: { name: user.name, email: user.email, image: user.image }
    });
  } catch (error) {
    console.error('Google set password error:', error);
    res.status(500).json({ error: error.message || 'Failed to create account' });
  }
};

