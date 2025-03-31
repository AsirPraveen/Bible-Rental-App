const User = require('../models/UserDetails');

exports.updateUser = async (req, res) => {
  const { name, email, mobile, image, gender, profession } = req.body;
  
  try {
    await User.updateOne(
      { email },
      { $set: { name, mobile, image, gender, profession } }
    );
    res.send({ status: "Ok", data: "Updated" });
  } catch (error) {
    res.send({ error });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const data = await User.find({});
    res.send({ status: "Ok", data });
  } catch (error) {
    res.send({ error });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.body;
  
  try {
    await User.deleteOne({ _id: id });
    res.send({ status: "Ok", data: "User Deleted" });
  } catch (error) {
    res.send({ error });
  }
};