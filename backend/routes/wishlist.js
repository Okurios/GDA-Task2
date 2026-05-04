const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// ─── GET /api/wishlist ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const items = await db.prepare(`
    SELECT w.id AS wishlist_id, p.id AS product_id,
           p.name, p.brand, p.category, p.price, p.image, p.sizes, p.stock
    FROM wishlist w
    JOIN products p ON w.product_id = p.id
    WHERE w.user_id = ?
    ORDER BY w.id DESC
  `).all(req.user.id);
  return res.json(items);
});

// ─── GET /api/wishlist/ids  (just product IDs — used by dashboard for hearts) ─
router.get('/ids', async (req, res) => {
  const rows = await db.prepare(
    'SELECT product_id FROM wishlist WHERE user_id = ?'
  ).all(req.user.id);
  return res.json(rows.map(r => r.product_id));
});

// ─── POST /api/wishlist/toggle ────────────────────────────────────────────────
router.post('/toggle', async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id is required.' });

  const existing = await db.prepare(
    'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?'
  ).get(req.user.id, product_id);

  if (existing) {
    await db.prepare('DELETE FROM wishlist WHERE id = ?').run(existing.id);
    return res.json({ wishlisted: false, message: 'Removed from wishlist.' });
  } else {
    await db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user.id, product_id);
    return res.json({ wishlisted: true, message: 'Added to wishlist!' });
  }
});

// ─── DELETE /api/wishlist/:productId ─────────────────────────────────────────
router.delete('/:productId', async (req, res) => {
  await db.prepare(
    'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?'
  ).run(req.user.id, parseInt(req.params.productId));
  return res.json({ message: 'Removed from wishlist.' });
});

module.exports = router;
