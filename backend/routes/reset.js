const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const db       = require('../database');
const { sendEmail, passwordResetEmail } = require('../services/email');

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Always return the same message (don't reveal whether email exists)
  const genericMsg = 'If an account with that email exists, a reset link has been sent.';

  if (!user) return res.json({ message: genericMsg });

  // Delete any existing unused tokens for this user
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);

  const token    = crypto.randomBytes(32).toString('hex');
  const expires  = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour

  db.prepare(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(user.id, token, expires);

  const resetLink = `http://localhost:3000/reset-password-v2.html?token=${token}`;

  sendEmail(
    user.email,
    'Reset Your GDA Sports Password',
    passwordResetEmail(user.fullname, resetLink)
  );

  // Return the link in the response too (handy when Mailtrap isn't configured yet)
  return res.json({ message: genericMsg, devLink: resetLink });
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password)
    return res.status(400).json({ error: 'Token and new password are required.' });
  if (new_password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const record = db.prepare(
    'SELECT * FROM password_reset_tokens WHERE token = ?'
  ).get(token);

  if (!record)
    return res.status(400).json({ error: 'Invalid or expired reset link.' });
  if (record.used)
    return res.status(400).json({ error: 'This reset link has already been used.' });
  if (new Date(record.expires_at) < new Date())
    return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, record.user_id);
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(record.id);

  return res.json({ message: 'Password reset successfully! You can now log in with your new password.' });
});

module.exports = router;
