const Post = require('../models/Post');
const User = require('../models/UserDetails');

exports.createPost = async (req, res) => {
  const { title, description, date, time, imageUrl, audienceType, targetUsers, showInNotification } = req.body;
  try {
    if (!title || !description) {
      return res.status(400).send({ status: "error", data: "Title and description are required" });
    }

    const post = await Post.create({
      title,
      description,
      date: date || null,
      time: time || null,
      imageUrl: imageUrl || null,
      audienceType: audienceType || 'all',
      targetUsers: targetUsers || [],
      showInNotification: showInNotification || false,
      likes: 0,
    });

    // Handle Push Notifications (Always triggered as requested)
    try {
      let query = {};
      if (audienceType === 'specific' && targetUsers && targetUsers.length > 0) {
        query = { email: { $in: targetUsers } };
      }

      const usersWithTokens = await User.find({ 
        ...query, 
        expoPushToken: { $exists: true, $ne: null } 
      }).select('expoPushToken');

      const tokens = usersWithTokens.map(u => u.expoPushToken);

      if (tokens.length > 0) {
        const axios = require('axios');
        const chunks = [];
        // Expo allows max 100 per request
        for (let i = 0; i < tokens.length; i += 100) {
          chunks.push(tokens.slice(i, i + 100));
        }

        for (const chunk of chunks) {
          await axios.post('https://exp.host/--/api/v2/push/send', chunk.map(token => ({
            to: token,
            sound: 'default',
            title: title,
            body: description.length > 100 ? description.substring(0, 100) + '...' : description,
            data: { postId: post._id, type: 'post' },
          })));
        }
      }
    } catch (pushError) {
      console.error('Error sending push notifications:', pushError);
      // We continue anyway as the post was created
    }


    res.send({ status: "Ok", data: post });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.getAllPosts = async (req, res) => {
  const { userEmail } = req.query;
  try {
    let query = { showInNotification: true };
    
    if (userEmail) {
      query.$or = [
        { audienceType: 'all' },
        { targetUsers: userEmail }
      ];
    } else {
      // If no userEmail, only show 'all' audience posts
      query.audienceType = 'all';
    }

    const posts = await Post.find(query).sort({ createdAt: -1 });
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

exports.adminGetAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.send({ status: "Ok", data: posts });
  } catch (error) {
    console.error('Error fetching admin posts:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.deletePost = async (req, res) => {
  const { postId } = req.params;
  try {
    const post = await Post.findByIdAndDelete(postId);
    if (!post) {
      return res.status(404).send({ status: "error", data: "Post not found" });
    }
    res.send({ status: "Ok", data: "Post deleted successfully" });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};