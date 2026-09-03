require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const app = express();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
const authorRoutes = require('./routes/authorRoutes');
const postRoutes = require('./routes/postRoutes'); // Add post routes
const cloudinaryRoutes = require('./routes/cloudinaryRoutes');
const prayerRoutes = require('./routes/prayerRoutes');
const fastingRoutes = require('./routes/fastingRoutes');
const forumRoutes = require('./routes/forumRoutes');
const mapRoutes = require('./routes/mapRoutes');
const adminAnalyticsRoutes = require('./routes/adminAnalyticsRoutes');
const readingStatRoutes = require('./routes/readingStatRoutes');
const moderationRoutes = require('./routes/moderationRoutes');
const gameRoutes = require('./routes/gameRoutes'); // Game routes
const emailTemplateRoutes = require('./routes/emailTemplateRoutes');
const bibleRoutes = require('./routes/bibleRoutes'); // Bible routes
const readingTrackerRoutes = require('./routes/readingTrackerRoutes');
const appSettingsRoutes = require('./routes/appSettingsRoutes');
const songRoutes = require('./routes/songRoutes');
const messageNoteRoutes = require('./routes/messageNoteRoutes');
const standaloneReminderRoutes = require('./routes/standaloneReminderRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const fellowshipRoutes = require('./routes/fellowshipRoutes');
const generatedPdfRoutes = require('./routes/generatedPdfRoutes');
const biblicalArtifactRoutes = require('./routes/biblicalArtifactRoutes');
const imageGenRoutes = require('./routes/imageGenRoutes');

const cron = require('node-cron');
const { notifyUserById } = require('./utils/notificationService');
const ReadingStat = require('./models/ReadingStat');

const mongoUrl = process.env.MONGO_URL;
const PORT = process.env.PORT || 5001;

// Fail at boot rather than at request time. Without this, a missing JWT_SECRET
// starts the server happily and every jwt.sign() throws on the first login.
const REQUIRED_ENV = ['MONGO_URL', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

app.use(express.json({ limit: '4mb' }));

mongoose.connect(mongoUrl)
  .then(() => console.log("Database Connected"))
  .catch((e) => {
    console.error("Database connection failed:", e.message);
    process.exit(1);
  });

app.get("/", (req, res) => {
  res.send({ status: "Started" });
});

// Disable caching for API calls to prevent stale data on clients (e.g. fellowship type updates)
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', bookRoutes);
app.use('/', authorRoutes);
app.use('/api', postRoutes); // Add post routes to the /api prefix
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api', prayerRoutes); // prayer requests
app.use('/api', fastingRoutes); // fasting
app.use('/api', forumRoutes); // forum
app.use('/api', mapRoutes); // historical maps
app.use('/api', adminAnalyticsRoutes); // admin analytics
app.use('/api', readingStatRoutes); // reading stats sync
app.use('/api', moderationRoutes); // moderation
app.use('/api/game', gameRoutes); // card game api
app.use('/api', emailTemplateRoutes);
app.use('/api/bible', bibleRoutes); // Bible routes
app.use('/api/reading-tracker', readingTrackerRoutes);
app.use('/api', appSettingsRoutes);
app.use('/api', songRoutes); // Songs
app.use('/api/notes', messageNoteRoutes);
app.use('/api/reminders', standaloneReminderRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/fellowships', fellowshipRoutes);
app.use('/api', generatedPdfRoutes);
app.use('/api', biblicalArtifactRoutes);
app.use('/api', imageGenRoutes);

// ─── 404 + TERMINAL ERROR HANDLER ────────────────────────────────────
// Must come after every route. Without these, an unhandled throw inside an
// async handler leaves the request hanging until the client times out.
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `No route matches ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ status: 'error', message: 'Internal server error' });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

/**
 * Returns the current hour (00-23) in the given IANA timezone, falling back to
 * server time when the zone is missing or unrecognised.
 */
const currentHourIn = (timeZone) => {
  try {
    if (timeZone) {
      return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', hour12: false, timeZone
      }).format(new Date());
    }
  } catch (_) {
    // Unknown zone - fall through to server time.
  }
  return new Date().getHours().toString().padStart(2, '0');
};

/**
 * DYNAMIC DAILY BIBLE READING REMINDER
 * Runs every hour on the minute 0 and notifies users whose configured reminder
 * hour matches the current hour IN THEIR OWN TIMEZONE.
 */
cron.schedule('0 * * * *', async () => {
  console.log('[Cron] Checking reading reminders...');

  const BATCH_SIZE = 200;
  let processed = 0;
  let sent = 0;

  try {
    // Stream in batches instead of loading every matching stat (and its fully
    // populated user) into memory at once.
    const cursor = ReadingStat.find({ 'planProgress.completedToday': false })
      .populate('user', 'email expoPushToken notificationSettings')
      .batchSize(BATCH_SIZE)
      .cursor();

    for await (const stat of cursor) {
      processed++;
      const user = stat.user;
      if (!user || !user.expoPushToken) continue;

      const settings = user.notificationSettings || {};
      if (settings.readingReminders === false) continue;

      const preferredHour = (settings.readingReminderTime || '18:00').split(':')[0];
      if (preferredHour !== currentHourIn(settings.timezone)) continue;

      await notifyUserById(
        user._id,
        'readingReminders',
        'Bible Study Time \u{1F4D6}',
        'Time to finish your daily reading portion and grow in the Word today!',
        { type: 'reading_planner' }
      );
      sent++;
    }

    console.log(`[Cron] Reading reminders: ${sent} sent across ${processed} tracked plans.`);
  } catch (err) {
    console.error('[Cron] Error in reading reminder job:', err);
  }
});

const { execSync } = require('child_process');

const freePort = (port) => {
  // Development convenience only. On a shared host this would terminate
  // whatever holds the port — including a healthy instance mid-restart.
  if (process.env.NODE_ENV === 'production') {
    console.error('[Server] Port is in use. Refusing to kill the holder in production.');
    return;
  }
  if (process.platform !== 'win32') {
    console.log('[Server] Port-freeing is only supported on Windows. Skipping.');
    return;
  }
  try {
    // Find the PID using the port on Windows
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const lines = result.split('\n').filter(l => l.includes('LISTENING'));
    const pids = [...new Set(lines.map(l => l.trim().split(/\s+/).pop()).filter(Boolean))];
    pids.forEach(pid => {
      try {
        execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf8' });
        console.log(`[Server] Killed process PID ${pid} blocking port ${port}`);
      } catch (e) {
        // already dead
      }
    });
  } catch (_) {
    // netstat found nothing — port truly free
  }
};

// ─── HTTP + SOCKET.IO SERVER ─────────────────────────────────────────
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const Fellowship = require('./models/Fellowship');
const ChatMessage = require('./models/Message');
const ChatUser = require('./models/UserDetails');

const server = http.createServer(app);
// Restrict socket origins once a web build ships. ALLOWED_ORIGINS is a
// comma-separated list; native clients send no Origin header and are unaffected.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(o => o.trim()).filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : true,
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.IO JWT authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await ChatUser.findOne({ email: decoded.email }).select('name email image activeOrganizationId memberships');
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

/**
 * Loads a fellowship and confirms the socket's user is a member of it.
 *
 * Every fellowship event must go through this. Membership was previously
 * checked only in send_message, so joining a room, reacting, voting and
 * answering a Q&A were all open to any authenticated user who knew an id.
 *
 * @returns {Promise<{fellowship: object, member: object}|null>}
 */
const authorizeFellowship = async (socket, fellowshipId) => {
  if (!fellowshipId) return null;
  let fellowship;
  try {
    fellowship = await Fellowship.findById(fellowshipId);
  } catch (_) {
    return null; // malformed ObjectId
  }
  if (!fellowship) return null;

  const member = fellowship.members.find(
    m => m.user.toString() === socket.user._id.toString()
  );
  if (!member) return null;

  return { fellowship, member };
};

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.user.name} (${socket.user._id})`);

  // ── Join a fellowship room ──
  socket.on('join_fellowship', async (fellowshipId) => {
    const access = await authorizeFellowship(socket, fellowshipId);
    if (!access) {
      socket.emit('error_message', { message: 'You are not a member of this fellowship.' });
      return;
    }
    socket.join(`fellowship:${fellowshipId}`);
    console.log(`📖 ${socket.user.name} joined fellowship:${fellowshipId}`);
  });

  // ── Leave a fellowship room ──
  socket.on('leave_fellowship', (fellowshipId) => {
    socket.leave(`fellowship:${fellowshipId}`);
  });

  // ── Send message ──
  socket.on('send_message', async (data) => {
    try {
      const { fellowshipId, text } = data;
      if (!fellowshipId || !text || !text.trim()) return;

      // Verify membership
      const access = await authorizeFellowship(socket, fellowshipId);
      if (!access) {
        socket.emit('error_message', { message: 'You are not a member of this fellowship.' });
        return;
      }
      const { fellowship, member } = access;

      // Check announcement mode
      if (fellowship.type === 'announcement' && member.role !== 'shepherd') {
        socket.emit('error_message', { message: 'Only shepherds can post in announcement fellowships.' });
        return;
      }

      // Save message
      const message = await ChatMessage.create({
        fellowship: fellowshipId,
        sender: socket.user._id,
        senderName: socket.user.name,
        text: text.trim(),
        type: data.type || 'text',
        pollData: data.pollData || undefined,
        qnaData: data.qnaData || undefined,
        readBy: [socket.user._id],
        replyTo: data.replyTo || undefined
      });

      // Update fellowship's lastMessage cache
      fellowship.lastMessage = {
        text: data.type === 'poll' ? `Poll: ${text.trim()}` : data.type === 'qna' ? `Q&A: ${text.trim()}` : text.trim().substring(0, 100),
        sender: socket.user._id,
        senderName: socket.user.name,
        sentAt: message.createdAt
      };
      await fellowship.save();

      // Populate sender for the broadcast
      const populated = await ChatMessage.findById(message._id)
        .populate('sender', 'name email image');

      const responseData = populated.toObject();
      if (data.tempId) {
        responseData.tempId = data.tempId;
      }

      // Broadcast to all in the room
      io.to(`fellowship:${fellowshipId}`).emit('new_message', responseData);
    } catch (err) {
      console.error('send_message error:', err);
    }
  });

  // ── Typing indicator ──
  socket.on('typing', async (data) => {
    const { fellowshipId, isTyping } = data;
    if (!await authorizeFellowship(socket, fellowshipId)) return;
    socket.to(`fellowship:${fellowshipId}`).emit('user_typing', {
      userId: socket.user._id,
      userName: socket.user.name,
      isTyping
    });
  });

  // ── React to message ──
  socket.on('react_message', async (data) => {
    try {
      const { fellowshipId, messageId, emoji } = data;
      if (!await authorizeFellowship(socket, fellowshipId)) return;

      // The message must belong to the fellowship we just authorized.
      const message = await ChatMessage.findOne({ _id: messageId, fellowship: fellowshipId });
      if (!message) return;

      // Find any reaction by this user on this message
      const userReactionIndex = message.reactions.findIndex(
        r => r.user.toString() === socket.user._id.toString()
      );

      if (userReactionIndex > -1) {
        const existingReaction = message.reactions[userReactionIndex];
        // Remove their existing reaction
        message.reactions.splice(userReactionIndex, 1);

        // If the existing reaction was a DIFFERENT emoji, add the new one
        if (existingReaction.emoji !== emoji) {
          message.reactions.push({
            emoji,
            user: socket.user._id,
            username: socket.user.name
          });
        }
      } else {
        // No existing reaction by this user: just add the reaction
        message.reactions.push({
          emoji,
          user: socket.user._id,
          username: socket.user.name
        });
      }

      await message.save();

      // Broadcast reaction update to everyone in the room
      io.to(`fellowship:${fellowshipId}`).emit('message_reaction_updated', {
        messageId,
        reactions: message.reactions
      });
    } catch (err) {
      console.error('react_message error:', err);
    }
  });

  // ── Vote in a poll ──
  socket.on('vote_poll', async (data) => {
    try {
      const { fellowshipId, messageId, optionIndex } = data;
      if (!await authorizeFellowship(socket, fellowshipId)) return;

      const message = await ChatMessage.findOne({ _id: messageId, fellowship: fellowshipId });
      if (!message || message.type !== 'poll' || !message.pollData) return;

      const userIdStr = socket.user._id.toString();
      const allowMultiple = message.pollData.allowMultiple;
      const options = message.pollData.options;

      if (optionIndex < 0 || optionIndex >= options.length) return;

      const hasVotedForThis = options[optionIndex].votes.some(v => v.toString() === userIdStr);

      if (allowMultiple) {
        if (hasVotedForThis) {
          options[optionIndex].votes = options[optionIndex].votes.filter(v => v.toString() !== userIdStr);
        } else {
          options[optionIndex].votes.push(socket.user._id);
        }
      } else {
        options.forEach((opt, idx) => {
          if (idx === optionIndex) {
            if (hasVotedForThis) {
              opt.votes = opt.votes.filter(v => v.toString() !== userIdStr);
            } else {
              opt.votes.push(socket.user._id);
            }
          } else {
            opt.votes = opt.votes.filter(v => v.toString() !== userIdStr);
          }
        });
      }

      await message.save();

      const populated = await ChatMessage.findById(message._id)
        .populate('sender', 'name email image');

      io.to(`fellowship:${fellowshipId}`).emit('message_updated', populated.toObject());
    } catch (err) {
      console.error('vote_poll error:', err);
    }
  });

  // ── Submit Q&A Answer ──
  socket.on('submit_qna_answer', async (data) => {
    try {
      const { fellowshipId, messageId, answerText } = data;
      if (!answerText || !answerText.trim()) return;
      if (!await authorizeFellowship(socket, fellowshipId)) return;

      const message = await ChatMessage.findOne({ _id: messageId, fellowship: fellowshipId });
      if (!message || message.type !== 'qna' || !message.qnaData) return;

      const userIdStr = socket.user._id.toString();
      const isOneTime = message.qnaData.isOneTimeAnswerable;
      const answers = message.qnaData.answers || [];

      const existingIndex = answers.findIndex(a => a.user.toString() === userIdStr);
      if (isOneTime && existingIndex > -1) {
        socket.emit('error_message', { message: 'This Q&A only allows one-time submission.' });
        return;
      }

      answers.push({
        user: socket.user._id,
        username: socket.user.name,
        answerText: answerText.trim(),
        submittedAt: new Date()
      });

      message.qnaData.answers = answers;
      await message.save();

      const populated = await ChatMessage.findById(message._id)
        .populate('sender', 'name email image');

      const responseObj = populated.toObject();
      if (!responseObj.qnaData.isAnswerVisibleToAll) {
        // Redact answerText from broadcast for security
        responseObj.qnaData.answers = responseObj.qnaData.answers.map(a => ({
          ...a,
          answerText: a.user.toString() === userIdStr ? a.answerText : '(Hidden)'
        }));
      }

      io.to(`fellowship:${fellowshipId}`).emit('message_updated', responseObj);
    } catch (err) {
      console.error('submit_qna_answer error:', err);
    }
  });

  // ── Mark messages as read ──
  socket.on('mark_read', async (data) => {
    try {
      const { fellowshipId } = data;
      if (!await authorizeFellowship(socket, fellowshipId)) return;

      await ChatMessage.updateMany(
        {
          fellowship: fellowshipId,
          readBy: { $ne: socket.user._id },
          sender: { $ne: socket.user._id }
        },
        { $addToSet: { readBy: socket.user._id } }
      );
      socket.to(`fellowship:${fellowshipId}`).emit('messages_read', {
        userId: socket.user._id,
        fellowshipId
      });
    } catch (err) {
      console.error('mark_read error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.user.name}`);
  });
});

server.listen(PORT, () => {
  console.log(`✅  Node.js server started on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️  Port ${PORT} is in use. Attempting to free it...`);
    freePort(PORT);
    setTimeout(() => {
      server.close();
      server.listen(PORT, () => {
        console.log(`✅  Server restarted on port ${PORT} after freeing the port.`);
      });
    }, 1500);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
