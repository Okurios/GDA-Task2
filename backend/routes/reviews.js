const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { verifyToken } = require('../middleware/auth');

// ─── GET /api/reviews/:productId ─────────────────────────────────────────────
router.get('/:productId', async (req, res) => {
  const reviews = await db.prepare(`
    SELECT r.id, r.rating, r.comment, r.created_at, u.fullname
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.productId);

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return res.json({
    reviews,
    average: parseFloat(avg.toFixed(1)),
    count: reviews.length
  });
});

// ─── GET /api/reviews/:productId/mine  (check if logged-in user reviewed) ────
router.get('/:productId/mine', verifyToken, async (req, res) => {
  const review = await db.prepare(
    'SELECT * FROM reviews WHERE product_id = ? AND user_id = ?'
  ).get(req.params.productId, req.user.id);
  return res.json(review || null);
});

// ─── POST /api/reviews  (add or update own review) ───────────────────────────
router.post('/', verifyToken, async (req, res) => {
  const { product_id, rating, comment = '' } = req.body;

  if (!product_id || !rating)
    return res.status(400).json({ error: 'product_id and rating are required.' });
  if (rating < 1 || rating > 5)
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });

  // Check product exists
  const product = await db.prepare('SELECT id FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const existing = await db.prepare(
    'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?'
  ).get(product_id, req.user.id);

  if (existing) {
    await db.prepare(
      "UPDATE reviews SET rating = ?, comment = ?, created_at = datetime('now') WHERE id = ?"
    ).run(rating, comment, existing.id);
    return res.json({ message: 'Your review has been updated.' });
  } else {
    await db.prepare(
      'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)'
    ).run(product_id, req.user.id, rating, comment);
    return res.json({ message: 'Review submitted! Thank you.' });
  }
});

// ─── DELETE /api/reviews/:productId  (delete own review) ─────────────────────
router.delete('/:productId', verifyToken, async (req, res) => {
  await db.prepare(
    'DELETE FROM reviews WHERE product_id = ? AND user_id = ?'
  ).run(req.params.productId, req.user.id);
  return res.json({ message: 'Review deleted.' });
});

module.exports = router;
