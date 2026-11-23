const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();
const reserved = ['me', 'search', 'admin'];

const makeToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const safeUser = (u) => ({
  id: u._id,
  username: u.username,
  email: u.email,
  bio: u.bio,
  avatarUrl: u.avatarUrl,
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username) || reserved.includes(username)) {
      return res.status(400).json({
        message: 'Username must be 3-20 letters, numbers or underscores',
      });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    if (await User.findOne({ username })) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const user = await User.create({
      username,
      email,
      password: await bcrypt.hash(password, 10),
    });
    res.status(201).json({ token: makeToken(user._id), user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    res.json({ token: makeToken(user._id), user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json(safeUser(req.user)));

module.exports = router;