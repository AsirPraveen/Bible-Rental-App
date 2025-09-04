const Post = require('../models/Post');
const User = require('../models/UserDetails');

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

exports.toggleLike = async (req, res) => {
  const { postId } = req.params;
  const userEmail = req.body.userEmail; // Assuming token is sent in the request body
  console.log("User Email:", userEmail, "Post ID:", postId);
  try {
    // Verify user
    const user = await User.findOne({ email: userEmail });
    console.log("User:", user);
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found" });
    }

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).send({ status: "error", data: "Post not found" });
    }

    // Check if user has already liked the post
    const hasLiked = post.likedBy.includes(userEmail);
    let newLikes = post.likes;
    console.log("Has Liked:", hasLiked, newLikes);
    if (hasLiked) {
      // Unlike: Remove user from likedBy and decrement likes
      await Post.findByIdAndUpdate(postId, {
        $pull: { likedBy: userEmail },
        $inc: { likes: -1 },
      });
      newLikes -= 1;
    } else {
      // Like: Add user to likedBy and increment likes
      await Post.findByIdAndUpdate(postId, {
        $push: { likedBy: userEmail },
        $inc: { likes: 1 },
      });
      newLikes += 1;
    }

    res.send({ status: "Ok", data: await Post.findById(postId) });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};