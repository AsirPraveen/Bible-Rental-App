const Post = require('../models/Post');
const User = require('../models/UserDetails');

/**
 * Shapes a post for a member-facing response.
 *
 * `likedBy` and `targetUsers` are arrays of email addresses. Sending them to
 * every reader handed out a member directory, so they are replaced with the
 * one derived fact the UI actually needs — whether *this* reader liked it.
 * The admin list (`/api/admin/posts`) still returns targetUsers, which is the
 * only screen that displays them.
 */
const forMember = (post, userEmail) => {
  const doc = post.toObject ? post.toObject() : post;
  const { likedBy, targetUsers, ...rest } = doc;
  return {
    ...rest,
    likedByMe: Array.isArray(likedBy) && likedBy.includes(userEmail)
  };
};

exports.createPost = async (req, res) => {
  const { title, description, date, time, imageUrl, audienceType, targetUsers, showInNotification, visibility } = req.body;
  try {
    if (!title || !description) {
      return res.status(400).send({ status: "error", data: "Title and description are required" });
    }

    const post = await Post.create({
      organization: req.orgId,
      title,
      description,
      date: date || null,
      time: time || null,
      imageUrl: imageUrl || null,
      audienceType: audienceType || 'all',
      targetUsers: targetUsers || [],
      showInNotification: showInNotification || false,
      visibility: visibility || 'org',
      likes: 0,
    });

    // Handle Push Notifications scoped to the organization
    try {
      let targetQuery = { 'memberships.organization': req.orgId };
      if (audienceType === 'specific' && targetUsers && targetUsers.length > 0) {
        targetQuery.email = { $in: targetUsers };
      }

      const usersWithTokens = await User.find({ 
        ...targetQuery, 
        expoPushToken: { $exists: true, $ne: null } 
      }).select('expoPushToken');

      const tokens = usersWithTokens.map(u => u.expoPushToken);

      if (tokens.length > 0) {
        const axios = require('axios');
        const chunks = [];
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
    }

    res.send({ status: "Ok", data: post });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.getAllPosts = async (req, res) => {
  // Audience targeting follows the authenticated caller, not a query string.
  const userEmail = req.user.email;
  try {
    // Show posts belonging to this organization OR cross-org public posts
    let query = {
      $or: [
        { organization: req.orgId },
        { visibility: 'public' }
      ],
      showInNotification: true
    };
    
    if (userEmail) {
      query.$and = [
        {
          $or: [
            { audienceType: 'all' },
            { targetUsers: userEmail }
          ]
        }
      ];
    } else {
      query.audienceType = 'all';
    }

    const posts = await Post.find(query).sort({ createdAt: -1 });
    res.send({ status: "Ok", data: posts.map(p => forMember(p, userEmail)) });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.updatePostLikes = async (req, res) => {
  const { postId } = req.params;
  const { increment } = req.body;

  try {
    const post = await Post.findOne({
      _id: postId,
      $or: [{ organization: req.orgId }, { visibility: 'public' }]
    });
    if (!post) {
      return res.status(404).send({ status: "error", data: "Post not found or inaccessible" });
    }

    post.likes = increment ? post.likes + 1 : Math.max(post.likes - 1, 0);
    await post.save();

    res.send({ status: "Ok", data: post });
  } catch (error) {
    console.error('Error updating likes:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.toggleLike = async (req, res) => {
  const { postId } = req.params;
  // Attribute the like to the authenticated caller, not to a body field.
  const userEmail = req.user.email;
  try {
    const user = await User.findOne({ email: userEmail, 'memberships.organization': req.orgId });
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found in this organization" });
    }

    const post = await Post.findOne({
      _id: postId,
      $or: [{ organization: req.orgId }, { visibility: 'public' }]
    });
    if (!post) {
      return res.status(404).send({ status: "error", data: "Post not found or inaccessible" });
    }

    const hasLiked = post.likedBy.includes(userEmail);
    if (hasLiked) {
      await Post.findByIdAndUpdate(postId, {
        $pull: { likedBy: userEmail },
        $inc: { likes: -1 },
      });
    } else {
      await Post.findByIdAndUpdate(postId, {
        $push: { likedBy: userEmail },
        $inc: { likes: 1 },
      });
    }

    res.send({ status: "Ok", data: forMember(await Post.findById(postId), userEmail) });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.adminGetAllPosts = async (req, res) => {
  try {
    const posts = await Post.find({ organization: req.orgId }).sort({ createdAt: -1 });
    res.send({ status: "Ok", data: posts });
  } catch (error) {
    console.error('Error fetching admin posts:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};

exports.deletePost = async (req, res) => {
  const { postId } = req.params;
  try {
    const post = await Post.findOneAndDelete({ _id: postId, organization: req.orgId });
    if (!post) {
      return res.status(404).send({ status: "error", data: "Post not found" });
    }
    res.send({ status: "Ok", data: "Post deleted successfully" });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).send({ status: "error", data: error.message });
  }
};