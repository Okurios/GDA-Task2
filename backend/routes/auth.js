const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../database');
const { JWT_SECRET, verifyToken } = require('../middleware/auth');
const { sendEmail, welcomeEmail } = require('../services/email');

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { fullname, email, password } = req.body;

  if (!fullname || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const result = await db.prepare(
    "INSERT INTO users (fullname, email, password_hash, role) VALUES (?, ?, ?, 'user')"
  ).run(fullname, email, password_hash);

  // Send welcome email (non-blocking)
  sendEmail(email, `Welcome to GDA Sports, ${fullname}!`, welcomeEmail(fullname));

  return res.status(201).json({
    message: `Registration successful! Welcome, ${fullname}!`,
    userId: result.lastInsertRowid
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const passwordMatch = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, fullname: user.fullname, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.json({
    message: `Welcome back, ${user.fullname}!`,
    token,
    user: { id: user.id, fullname: user.fullname, email: user.email, role: user.role || 'user' }
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  const user = await db.prepare(
    'SELECT id, fullname, email, role, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json(user);
});

// ─── PUT /api/auth/profile ───────────────────────────────────────────────────
router.put('/profile', verifyToken, async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) {
    return res.status(400).json({ error: 'fullname and email are required.' });
  }
  const existing = await db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
  if (existing) {
    return res.status(409).json({ error: 'Email is already used by another account.' });
  }
  await db.prepare('UPDATE users SET fullname = ?, email = ? WHERE id = ?').run(fullname, email, req.user.id);
  return res.json({ message: 'Profile updated successfully.' });
});

// ─── PUT /api/auth/change-password ───────────────────────────────────────────
router.put('/change-password', verifyToken, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Both current and new password are required.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  return res.json({ message: 'Password changed successfully.' });
});

module.exports = router;
