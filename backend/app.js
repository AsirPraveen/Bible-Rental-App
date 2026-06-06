require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
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

const cron = require('node-cron');
const { notifyUserById } = require('./utils/notificationService');
const ReadingStat = require('./models/ReadingStat');

const mongoUrl = process.env.MONGO_URL;
const PORT = process.env.PORT || 5001;

app.use(express.json());

mongoose.connect(mongoUrl)
  .then(() => console.log("Database Connected"))
  .catch((e) => console.log(e));

app.get("/", (req, res) => {
  res.send({ status: "Started" });
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

/**
 * DYNAMIC DAILY BIBLE READING REMINDER
 * Runs every hour on the minute 0.
 * Checks for users who have a reading reminder set for THIS hour.
 */
cron.schedule('0 * * * *', async () => {
  const currentHourNum = new Date().getHours();
  const currentHourStr = currentHourNum.toString().padStart(2, '0') + ':00';
  
  console.log(`[Cron] Checking reading reminders for ${currentHourStr}...`);
  
  try {
    // 1. Find all reading stats where at least one plan is NOT completed today
    const stats = await ReadingStat.find({ 
      'planProgress.completedToday': false 
    }).populate('user');

    for (const stat of stats) {
      if (stat.user && stat.user.expoPushToken) {
        const user = stat.user;
        const userSettings = user.notificationSettings || {};
        
        // 2. Check if user has reading reminders enabled
        if (userSettings.readingReminders !== false) {
           // 3. Check if the current hour matches the user's preferred reminder time
           // Note: We match the hour part (e.g., '18:00' matches 6:00 PM)
           const preferredHour = userSettings.readingReminderTime?.split(':')[0];
           
           if (preferredHour === currentHourNum.toString().padStart(2, '0')) {
              await notifyUserById(
                user._id, 
                'readingReminders', 
                'Bible Study Time 📖', 
                'Don\'t forget to finish your daily reading portion to grow in the Word today!',
                { type: 'reading_planner' }
              );
              console.log(`[Cron] Notification sent to user ${user.email}`);
           }
        }
      }
    }
  } catch (err) {
    console.error('[Cron] Error in reading reminder job:', err);
  }
});

const { execSync } = require('child_process');

const freePort = (port) => {
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

const server = app.listen(PORT, () => {
  console.log(`✅  Node.js server started on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️  Port ${PORT} is in use. Attempting to free it...`);
    freePort(PORT);
    setTimeout(() => {
      server.close();
      app.listen(PORT, () => {
        console.log(`✅  Server restarted on port ${PORT} after freeing the port.`);
      });
    }, 1500);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
