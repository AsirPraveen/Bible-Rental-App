require('dotenv').config();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/UserDetails');
const Book = require('../models/Book');
const Organization = require('../models/Organization');
const nodemailer = require('nodemailer');
const { resetPasswordTemplate } = require('../config/emailTemplate');
const { verifyGoogleCredential } = require('../utils/googleVerify');

const JWT_SECRET = process.env.JWT_SECRET;

// Only ever expose these fields of a user document to a client.
const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  image: user.image || ''
});

exports.register = async (req, res) => {
  const { name, email, mobile, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).send({ status: "error", data: "Name, email and password are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).send({ status: "error", data: "Please enter a valid email address" });
    }
    if (password.length < 8) {
      return res.status(400).send({ status: "error", data: "Password must be at least 8 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const oldUser = await User.findOne({ email: normalizedEmail });
    if (oldUser) return res.status(409).send({ status: "error", data: "User already exists!!" });

    const encryptedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      mobile,
      password: encryptedPassword,
      userType: 'User', // default to standard User type
      globalRole: null,
      memberships: [],
      activeOrganizationId: null
    });

    res.send({ status: "ok", data: "User Created", user: publicUser(newUser) });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).send({ status: "error", data: "An error occurred during registration" });
  }
};

exports.login = async (req, res) => {
  const { emailOrPhone, password } = req.body;

  try {
    const isPhone = /^[6-9][0-9]{9}$/.test(emailOrPhone);
    const query = isPhone ? { mobile: emailOrPhone } : { email: emailOrPhone };
    const oldUser = await User.findOne(query).populate('memberships.organization');

    // Same response for an unknown account and a bad password, so the endpoint
    // cannot be used to discover which email addresses are registered.
    if (!oldUser || !oldUser.password) {
      return res.status(401).send({ status: "error", data: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, oldUser.password);
    if (passwordMatch) {
      if (oldUser.globalRole !== 'SuperAdmin' && oldUser.activeOrganizationId) {
        const activeOrg = await Organization.findById(oldUser.activeOrganizationId);
        if (!activeOrg || !activeOrg.isActive) {
          let fallbackOrgId = null;
          for (const m of oldUser.memberships) {
            if (m.isActive && m.organization) {
              const o = await Organization.findById(m.organization._id);
              if (o && o.isActive) {
                fallbackOrgId = o._id;
                break;
              }
            }
          }
          if (fallbackOrgId) {
            oldUser.activeOrganizationId = fallbackOrgId;
          } else {
            return res.status(403).json({
              status: "error",
              code: "ORG_SUSPENDED",
              data: "Your organization has been freezed. Please contact your organization administrator."
            });
          }
        }
      }

      oldUser.lastActiveAt = new Date();
      await oldUser.save();
      const token = jwt.sign({ email: oldUser.email }, JWT_SECRET, { expiresIn: '30d' });

      // Determine user role for the active org
      let activeOrgRole = 'User';
      if (oldUser.activeOrganizationId) {
        const activeMembership = oldUser.memberships.find(
          m => m.organization._id.toString() === oldUser.activeOrganizationId.toString()
        );
        if (activeMembership) {
          activeOrgRole = activeMembership.role;
        }
      }

      return res.status(201).send({
        status: "ok",
        data: token,
        userType: oldUser.globalRole === 'SuperAdmin' ? 'SuperAdmin' : activeOrgRole,
        globalRole: oldUser.globalRole,
        activeOrganizationId: oldUser.activeOrganizationId,
        memberships: oldUser.memberships
      });
    }

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

    // Update active timestamp
    await User.updateOne({ email: decoded.email }, { $set: { lastActiveAt: new Date() } });

    // Never ship credentials or reset material to the client.
    const user = await User.findOne({ email: decoded.email })
      .select('-password -otp -otpExpiry -otpAttempts -resetPasswordExpires -secretText')
      .populate('memberships.organization')
      .lean();

    if (!user) {
      return res.status(404).send({ status: "error", message: "User not found" });
    }

    let activeOrgId = user.activeOrganizationId;
    if (user.globalRole !== 'SuperAdmin' && activeOrgId) {
      const activeOrg = await Organization.findById(activeOrgId);
      if (!activeOrg || !activeOrg.isActive) {
        let fallbackOrgId = null;
        for (const m of user.memberships) {
          if (m.isActive && m.organization) {
            const o = await Organization.findById(m.organization._id);
            if (o && o.isActive) {
              fallbackOrgId = o._id;
              break;
            }
          }
        }
        if (fallbackOrgId) {
          await User.updateOne({ _id: user._id }, { $set: { activeOrganizationId: fallbackOrgId } });
          activeOrgId = fallbackOrgId;
          user.activeOrganizationId = fallbackOrgId;
        } else {
          return res.status(403).json({
            status: "error",
            code: "ORG_SUSPENDED",
            message: "Your organization has been freezed. Please contact your administrator."
          });
        }
      }
    }

    // Filter books_rented by activeOrganizationId and populate book names
    if (user.books_rented && user.books_rented.length > 0) {
      user.books_rented = user.books_rented.filter(
        r => r.organization && r.organization.toString() === activeOrgId?.toString()
      );

      const bookIds = user.books_rented.map(r => r.book_id);
      const books = await Book.find({ book_id: { $in: bookIds }, organization: activeOrgId }).select('book_id book_name');
      const bookMap = new Map(books.map(b => [b.book_id, b.book_name]));

      user.books_rented = user.books_rented.map(r => ({
        ...r,
        book_name: bookMap.get(r.book_id) || 'Unknown Book'
      }));
    } else {
      user.books_rented = [];
    }

    // Filter and map favouriteBooks to a flat array of numbers (keeping frontend compatibility) and show new to old
    if (user.favouriteBooks && user.favouriteBooks.length > 0) {
      user.favouriteBooks = user.favouriteBooks
        .filter(f => f.organization && f.organization.toString() === activeOrgId?.toString())
        .map(f => f.book_id);
      user.favouriteBooks.reverse();
    } else {
      user.favouriteBooks = [];
    }

    // Sort likedVerses from new to old
    if (user.likedVerses && user.likedVerses.length > 0) {
      user.likedVerses.sort((a, b) => new Date(b.likedAt || 0) - new Date(a.likedAt || 0));
    } else {
      user.likedVerses = [];
    }

    // Filter likedSongs by activeOrganizationId, populate, and sort from new to old
    if (user.likedSongs && user.likedSongs.length > 0) {
      const activeLikedSongs = user.likedSongs.filter(
        s => s.organization && s.organization.toString() === activeOrgId?.toString()
      );
      
      const Song = require('../models/Song');
      const songIds = activeLikedSongs.map(s => s.song);
      const songs = await Song.find({ _id: { $in: songIds } }).populate('author').lean();
      const songMap = new Map(songs.map(s => [s._id.toString(), s]));
      
      user.likedSongs = activeLikedSongs.map(s => {
        const songData = songMap.get(s.song?.toString()) || {};
        return {
          _id: s.song,
          titleTamil: songData.titleTamil,
          titleEnglish: songData.titleEnglish,
          author: songData.author?.name || '',
          likedAt: s.likedAt
        };
      });

      user.likedSongs.sort((a, b) => new Date(b.likedAt || 0) - new Date(a.likedAt || 0));
    } else {
      user.likedSongs = [];
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    user.otpAttempts = 0;
    await user.save();

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

const MAX_OTP_ATTEMPTS = 5;

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !user.otp || Date.now() > user.otpExpiry) {
      return res.status(400).json({ status: 'error', data: 'Invalid or expired OTP' });
    }

    if (user.otp !== otp) {
      // Burn the OTP after a handful of wrong guesses so a 6-digit code cannot
      // be brute-forced across rotating IPs (which slip past the IP rate limit).
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        user.otp = undefined;
        user.otpExpiry = undefined;
        user.otpAttempts = 0;
        await user.save();
        return res.status(400).json({
          status: 'error',
          data: 'Too many incorrect attempts. Please request a new OTP.'
        });
      }
      await user.save();
      return res.status(400).json({ status: 'error', data: 'Invalid or expired OTP' });
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
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

// Runs behind the `auth` middleware — the token comes from the Authorization
// header and the account is always req.user, never an id supplied in the body.
exports.updatePushToken = async (req, res) => {
  const { expoPushToken } = req.body;
  try {
    await User.updateOne({ _id: req.user._id }, { $set: { expoPushToken: expoPushToken || null } });
    res.send({ status: "Ok", message: "Push token updated successfully" });
  } catch (error) {
    console.error('Error updating push token:', error);
    res.status(500).send({ status: "error", message: "Failed to update push token" });
  }
};

exports.googleLogin = async (req, res) => {
  const { idToken, accessToken } = req.body;
  try {
    // The email is taken from the credential Google signed, never from the body.
    let profile;
    try {
      profile = await verifyGoogleCredential({ idToken, accessToken });
    } catch (verifyErr) {
      console.warn('Google credential rejected:', verifyErr.message);
      return res.status(401).json({ status: 'error', error: 'Google sign-in could not be verified.' });
    }

    const email = profile.email;
    let user = await User.findOne({ email }).populate('memberships.organization');

    if (!user) {
      // Hand back a short-lived ticket so google-set-password can trust this
      // verification instead of re-accepting an email address from the client.
      const signupTicket = jwt.sign(
        { email, name: profile.name, image: profile.picture, googleId: profile.googleId, purpose: 'google_signup' },
        JWT_SECRET,
        { expiresIn: '10m' }
      );
      return res.status(200).json({
        status: 'ok',
        isNewUser: true,
        signupTicket,
        userData: { name: profile.name, email, image: profile.picture }
      });
    }

    if (user.globalRole !== 'SuperAdmin' && user.activeOrganizationId) {
      const activeOrg = await Organization.findById(user.activeOrganizationId);
      if (!activeOrg || !activeOrg.isActive) {
        let fallbackOrgId = null;
        for (const m of user.memberships) {
          if (m.isActive && m.organization) {
            const o = await Organization.findById(m.organization._id);
            if (o && o.isActive) {
              fallbackOrgId = o._id;
              break;
            }
          }
        }
        if (fallbackOrgId) {
          user.activeOrganizationId = fallbackOrgId;
          await user.save();
        } else {
          return res.status(403).json({
            status: "error",
            code: "ORG_SUSPENDED",
            error: "Your organization has been freezed. Please contact your organization administrator."
          });
        }
      }
    }

    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    let activeOrgRole = 'User';
    if (user.activeOrganizationId) {
      const activeMembership = user.memberships.find(
        m => m.organization._id.toString() === user.activeOrganizationId.toString()
      );
      if (activeMembership) {
        activeOrgRole = activeMembership.role;
      }
    }

    return res.status(200).json({
      status: 'ok',
      data: token,
      userType: user.globalRole === 'SuperAdmin' ? 'SuperAdmin' : activeOrgRole,
      globalRole: user.globalRole,
      isNewUser: false,
      userData: { name: user.name, email: user.email, image: user.image },
      activeOrganizationId: user.activeOrganizationId,
      memberships: user.memberships
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ status: 'error', error: 'Google login failed' });
  }
};

/**
 * Completes Google sign-up by setting a password on a BRAND NEW account.
 *
 * This endpoint can only create an account, never modify one. The email comes
 * from the short-lived signupTicket issued by googleLogin after it verified the
 * credential with Google — an existing user changes their password through the
 * OTP flow (forgot-password → verify-otp → reset-password), not through here.
 */
exports.googleSetPassword = async (req, res) => {
  // `name` is a cosmetic display name the user can edit on the sign-up screen.
  // The email — the actual security boundary — comes only from the ticket.
  const { signupTicket, newPassword, name } = req.body;
  try {
    if (!signupTicket || !newPassword) {
      return res.status(400).json({ status: 'error', error: 'Signup ticket and password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ status: 'error', error: 'Password must be at least 8 characters' });
    }

    let ticket;
    try {
      ticket = jwt.verify(signupTicket, JWT_SECRET);
    } catch (_) {
      return res.status(401).json({ status: 'error', error: 'Your sign-up session expired. Please sign in with Google again.' });
    }

    if (ticket.purpose !== 'google_signup' || !ticket.email) {
      return res.status(401).json({ status: 'error', error: 'Invalid sign-up session. Please sign in with Google again.' });
    }

    const email = ticket.email.toLowerCase().trim();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        status: 'error',
        error: 'An account already exists for this email. Please sign in, or use "Forgot password" to reset it.'
      });
    }

    const user = await User.create({
      name: (typeof name === 'string' && name.trim()) || ticket.name || email.split('@')[0],
      email,
      mobile: '',
      password: await bcrypt.hash(newPassword, 10),
      userType: 'User',
      globalRole: null,
      image: ticket.image || '',
      secretText: '',
      googleId: ticket.googleId || '',
    });

    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      status: 'ok',
      message: 'Account created successfully',
      data: token,
      userType: 'User',
      userData: { name: user.name, email: user.email, image: user.image }
    });
  } catch (error) {
    console.error('Google set password error:', error);
    res.status(500).json({ status: 'error', error: 'Failed to create account' });
  }
};
