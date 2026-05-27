/**
 * AI Web Scraper — Authentication Routes
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../storage/db');
const { generateToken, authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Apply rate limiting to auth routes
router.use(authLimiter);

/**
 * POST /api/auth/register
 * Create a new user account
 */
router.post('/register', (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: { message: 'Username, email, and password are required.' },
      });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        error: { message: 'Username must be between 3 and 30 characters.' },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: { message: 'Password must be at least 6 characters.' },
      });
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: { message: 'Invalid email format.' },
      });
    }

    // Check if username or email already exists
    const existing = db.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).get(username, email);

    if (existing) {
      return res.status(409).json({
        error: { message: 'Username or email already registered.' },
      });
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Create user
    const userId = uuidv4();
    db.prepare(
      'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)'
    ).run(userId, username, email, passwordHash);

    // Generate token
    const user = { id: userId, username, email, plan: 'free' };
    const token = generateToken(user);

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: userId,
        username,
        email,
        plan: 'free',
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({
      error: { message: 'Failed to create account.' },
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { message: 'Email and password are required.' },
      });
    }

    // Find user by email
    const user = db.prepare(
      'SELECT id, username, email, password_hash, plan FROM users WHERE email = ?'
    ).get(email);

    if (!user) {
      return res.status(401).json({
        error: { message: 'Invalid email or password.' },
      });
    }

    // Verify password
    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        error: { message: 'Invalid email or password.' },
      });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      plan: user.plan,
    });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        plan: user.plan,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      error: { message: 'Failed to login.' },
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticate, (req, res) => {
  try {
    const user = db.prepare(
      'SELECT id, username, email, plan, scrape_count, created_at FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: { message: 'User not found.' },
      });
    }

    res.json({ user });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({
      error: { message: 'Failed to get profile.' },
    });
  }
});

module.exports = router;
