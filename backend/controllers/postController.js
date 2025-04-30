const Post = require('../models/Post');

exports.createPost = async (req, res) => {
  const { title, description, date, time, imageUrl } = req.body;
  try {
    if (!title || !description || !date) {
      return res.status(400).send({ status: "error", data: "Title, description, and date are required" });
    }

    const post = await Post.create({
      title,
      description,
      date,
      time: time || null,
      imageUrl: imageUrl || null,
      likes: 0, // Initialize likes to 0
    });

    res.send({ status: "Ok", data: post });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.send({ status: "Ok", data: posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.updatePostLikes = async (req, res) => {
  const { postId } = req.params;
  const { increment } = req.body; // true to increment, false to decrement

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).send({ status: "error", data: "Post not found" });
    }

    post.likes = increment ? post.likes + 1 : Math.max(post.likes - 1, 0); // Prevent negative likes
    await post.save();

    res.send({ status: "Ok", data: post });
  } catch (error) {
    console.error('Error updating likes:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};