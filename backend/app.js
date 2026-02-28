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

app.listen(PORT, () => {
  console.log(`Node js server started on port ${PORT}`);
});