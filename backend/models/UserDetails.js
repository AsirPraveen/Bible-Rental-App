const mongoose = require("mongoose");

const UserDetailSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    mobile: String,
    password: String,
    image:String,
    gender:String,
    profession:String,
    userType:String,
    secretText:String,
    books_rented: [{
      book_id: { type: Number },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      requested_at: { type: Date, default: Date.now }
    }]
  },
  {
    collection: "UserInfo",
    timestamps: true
  }
);
module.exports = mongoose.model("UserInfo", UserDetailSchema);