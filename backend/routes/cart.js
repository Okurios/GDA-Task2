const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// ─── GET /api/cart ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const items = await db.prepare(
    'SELECT * FROM cart_items WHERE user_id = ? ORDER BY id'
  ).all(req.user.id);
  return res.json(items);
});

// ─── POST /api/cart/add ───────────────────────────────────────────────────────
// If same product_id + size + color already in cart → increment quantity instead of inserting
router.post('/add', async (req, res) => {
  const { product_id, product_name, price, size = '', color = '' } = req.body;

  if (!product_name || price === undefined) {
    return res.status(400).json({ error: 'product_name and price are required.' });
  }

  // Upsert: check for existing item with same product_id, size and color
  if (product_id) {
    const existing = await db.prepare(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ? AND color = ?'
    ).get(req.user.id, product_id, size, color);

    if (existing) {
      await db.prepare('UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?').run(existing.id);
      const opts = [size, color].filter(Boolean).join(', ');
      return res.json({
        message: `${product_name}${opts ? ' (' + opts + ')' : ''} — quantity increased!`,
        cartItemId: existing.id
      });
    }
  }

  // Insert new item
  const result = await db.prepare(
    'INSERT INTO cart_items (user_id, product_id, product_name, price, size, color, quantity) VALUES (?, ?, ?, ?, ?, ?, 1)'
  ).run(req.user.id, product_id || null, product_name, price, size, color);

  const opts = [size, color].filter(Boolean).join(', ');
  return res.status(201).json({
    message: `${product_name}${opts ? ' (' + opts + ')' : ''} added to cart!`,
    cartItemId: result.lastInsertRowid
  });
});

// ─── PUT /api/cart/update/:id ─────────────────────────────────────────────────
router.put('/update/:id', async (req, res) => {
  const { quantity } = req.body;
  const qty = parseInt(quantity);

  if (!qty || qty < 1) {
    return res.status(400).json({ error: 'Quantity must be at least 1.' });
  }

  const item = await db.prepare(
    'SELECT * FROM cart_items WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!item) return res.status(404).json({ error: 'Cart item not found.' });

  await db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(qty, req.params.id);
  return res.json({ message: 'Quantity updated.' });
});

// ─── DELETE /api/cart/remove/:id ─────────────────────────────────────────────
router.delete('/remove/:id', async (req, res) => {
  const item = await db.prepare(
    'SELECT * FROM cart_items WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!item) return res.status(404).json({ error: 'Cart item not found.' });

  await db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Item removed from cart.' });
});

// ─── DELETE /api/cart/clear ───────────────────────────────────────────────────
router.delete('/clear', async (req, res) => {
  await db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
  return res.json({ message: 'Cart cleared.' });
});

module.exports = router;
