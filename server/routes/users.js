const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const { protect } = require('../middleware/auth');

const router = express.Router();
const reserved = ['me', 'search', 'admin'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/users/search?q=...
router.get('/search', protect, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const users = await User.find({ username: { $regex: escapeRegex(q), $options: 'i' } })
      .select('username bio avatarUrl')
      .limit(20);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/me  (edit profile)
router.put('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (req.body.username !== undefined) {
      const username = req.body.username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(username) || reserved.includes(username)) {
        return res.status(400).json({
          message: 'Username must be 3-20 letters, numbers or underscores',
        });
      }
      if (username !== user.username && (await User.findOne({ username }))) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      user.username = username;
    }
    if (req.body.bio !== undefined) user.bio = String(req.body.bio).slice(0, 160);
    if (req.body.avatarUrl !== undefined) user.avatarUrl = String(req.body.avatarUrl).trim();

    await user.save();
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/users/:username  (view profile)
router.get('/:username', protect, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() })
      .select('-password -email');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [followers, following, posts, isFollowing] = await Promise.all([
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id }),
      Post.countDocuments({ author: user._id }),
      Follow.exists({ follower: req.user._id, following: user._id }),
    ]);

    res.json({
      id: user._id,
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      followers,
      following,
      posts,
      isFollowing: !!isFollowing,
      isMe: String(user._id) === String(req.user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users/:id/follow  (follow or unfollow)
router.post('/:id/follow', protect, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: 'Invalid user' });
    }
    if (String(targetId) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }
    if (!(await User.exists({ _id: targetId }))) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existing = await Follow.findOne({ follower: req.user._id, following: targetId });
    let isFollowing;
    if (existing) {
      await existing.deleteOne();
      isFollowing = false;
    } else {
      await Follow.create({ follower: req.user._id, following: targetId });
      isFollowing = true;
    }
    const followers = await Follow.countDocuments({ following: targetId });
    res.json({ isFollowing, followers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;