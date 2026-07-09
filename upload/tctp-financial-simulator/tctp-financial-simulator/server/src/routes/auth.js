const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Helper: sign JWT ─────────────────────────────────────────
function signToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
}

// ── POST /login ──────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const [rows] = await db.execute(
      'SELECT id, username, email, password_hash, full_name, role FROM users WHERE username = ?',
      [username]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /register ───────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, fullName, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    // Check for existing user
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, passwordHash, fullName || '', role || 'admin']
    );

    const user = {
      id: result.insertId,
      username,
      email,
      full_name: fullName || '',
      role: role || 'admin',
    };

    const token = signToken(user);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /me ──────────────────────────────────────────────────
router.get('/me', auth, async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, username, email, full_name, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const u = rows[0];
    res.json({
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      createdAt: u.created_at,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;