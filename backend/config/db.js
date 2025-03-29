const mongoose = require('mongoose');

const mongoUrl = "mongodb+srv://asir:asir@cluster0.z0qmu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUrl);
    console.log('Database Connected');
  } catch (error) {
    console.error('Database Connection Error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;