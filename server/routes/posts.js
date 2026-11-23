const express = require('express');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const Follow = require('../models/Follow');
const { protect } = require('../middleware/auth');

const router = express.Router();
const authorFields = 'username avatarUrl';

// Adds likeCount, commentCount and likedByMe to a list of posts
async function decorate(posts, me) {
  const ids = posts.map((p) => p._id);
  const [likeCounts, commentCounts, myLikes] = await Promise.all([
    Like.aggregate([
      { $match: { post: { $in: ids } } },
      { $group: { _id: '$post', n: { $sum: 1 } } },
    ]),
    Comment.aggregate([
      { $match: { post: { $in: ids } } },
      { $group: { _id: '$post', n: { $sum: 1 } } },
    ]),
    Like.find({ post: { $in: ids }, user: me }).select('post'),
  ]);
  const likes = new Map(likeCounts.map((x) => [String(x._id), x.n]));
  const comments = new Map(commentCounts.map((x) => [String(x._id), x.n]));
  const mine = new Set(myLikes.map((l) => String(l.post)));

  return posts.map((p) => ({
    ...p.toObject(),
    likeCount: likes.get(String(p._id)) || 0,
    commentCount: comments.get(String(p._id)) || 0,
    likedByMe: mine.has(String(p._id)),
  }));
}

// GET /api/posts/feed  (my posts + posts from people I follow)
router.get('/feed', protect, async (req, res) => {
  try {
    const follows = await Follow.find({ follower: req.user._id }).select('following');
    const authors = [req.user._id, ...follows.map((f) => f.following)];
    const posts = await Post.find({ author: { $in: authors } })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('author', authorFields);
    res.json(await decorate(posts, req.user._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/posts/user/:userId  (posts on one profile)
router.get('/user/:userId', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user' });
    }
    const posts = await Post.find({ author: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('author', authorFields);
    res.json(await decorate(posts, req.user._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/posts  (create post)
router.post('/', protect, async (req, res) => {
  try {
    const content = (req.body.content || '').trim();
    if (!content) return res.status(400).json({ message: 'Post cannot be empty' });
    if (content.length > 500) {
      return res.status(400).json({ message: 'Post is too long (max 500 characters)' });
    }
    const post = await Post.create({
      author: req.user._id,
      content,
      imageUrl: (req.body.imageUrl || '').trim(),
    });
    await post.populate('author', authorFields);
    res.status(201).json({ ...post.toObject(), likeCount: 0, commentCount: 0, likedByMe: false });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/posts/comments/:commentId
router.delete('/comments/:commentId', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.commentId)) {
      return res.status(400).json({ message: 'Invalid comment' });
    }
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const post = await Post.findById(comment.post);
    const mine = String(comment.author) === String(req.user._id);
    const myPost = post && String(post.author) === String(req.user._id);
    if (!mine && !myPost) {
      return res.status(403).json({ message: 'You cannot delete this comment' });
    }
    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/posts/:id  (only the author)
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (String(post.author) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }
    await Comment.deleteMany({ post: post._id });
    await Like.deleteMany({ post: post._id });
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/posts/:id/like  (like or unlike)
router.post('/:id/like', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post' });
    }
    if (!(await Post.exists({ _id: req.params.id }))) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const existing = await Like.findOne({ user: req.user._id, post: req.params.id });
    let liked;
    if (existing) {
      await existing.deleteOne();
      liked = false;
    } else {
      await Like.create({ user: req.user._id, post: req.params.id });
      liked = true;
    }
    const likeCount = await Like.countDocuments({ post: req.params.id });
    res.json({ liked, likeCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/posts/:id/comments
router.get('/:id/comments', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post' });
    }
    const comments = await Comment.find({ post: req.params.id })
      .sort({ createdAt: 1 })
      .populate('author', authorFields);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/posts/:id/comments
router.post('/:id/comments', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post' });
    }
    if (!(await Post.exists({ _id: req.params.id }))) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Comment cannot be empty' });
    if (text.length > 300) {
      return res.status(400).json({ message: 'Comment is too long (max 300 characters)' });
    }
    const comment = await Comment.create({ post: req.params.id, author: req.user._id, text });
    await comment.populate('author', authorFields);
    res.status(201).json(comment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;