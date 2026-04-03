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

app.listen(PORT, () => {
  console.log(`Node js server started on port ${PORT}`);
});
