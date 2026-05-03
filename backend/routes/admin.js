const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// All admin routes require login + admin role
router.use(verifyToken, requireAdmin);

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const userCount    = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role != 'admin'").get().c;
  const orderCount   = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  const revenue      = db.prepare('SELECT COALESCE(SUM(total), 0) AS r FROM orders').get().r;

  return res.json({ userCount, orderCount, productCount, revenue: parseFloat(revenue).toFixed(2) });
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', (req, res) => {
  const users = db.prepare(
    'SELECT id, fullname, email, role, created_at FROM users ORDER BY created_at DESC'
  ).all();
  return res.json(users);
});

// ─── PUT /api/admin/users/:id/role ───────────────────────────────────────────
router.put('/users/:id/role', (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'user' or 'admin'." });
  }
  // Prevent removing own admin role
  if (parseInt(req.params.id) === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'You cannot remove your own admin role.' });
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  return res.json({ message: `User role updated to ${role}.` });
});

// ─── DELETE /api/admin/users/:id ─────────────────────────────────────────────
router.delete('/users/:id', (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  return res.json({ message: 'User deleted.' });
});

// ─── GET /api/admin/orders ────────────────────────────────────────────────────
router.get('/orders', (req, res) => {
  const orders = db.prepare(`
    SELECT o.id, o.total, o.payment_method, o.created_at,
           u.fullname, u.email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `).all();

  const ordersWithItems = orders.map(order => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return { ...order, items };
  });

  return res.json(ordersWithItems);
});

// ─── GET /api/admin/products ──────────────────────────────────────────────────
router.get('/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id').all();
  return res.json(products);
});

// ─── POST /api/admin/products ─────────────────────────────────────────────────
router.post('/products', (req, res) => {
  const { name, brand, category, price, image = '', sizes = '', stock = 100 } = req.body;

  if (!name || !brand || !category || !price) {
    return res.status(400).json({ error: 'name, brand, category and price are required.' });
  }

  const result = db.prepare(
    'INSERT INTO products (name, brand, category, price, image, sizes, stock) VALUES (?,?,?,?,?,?,?)'
  ).run(name, brand, category, parseFloat(price), image, sizes, parseInt(stock));

  return res.status(201).json({ message: 'Product added successfully.', productId: result.lastInsertRowid });
});

// ─── PUT /api/admin/products/:id ─────────────────────────────────────────────
router.put('/products/:id', (req, res) => {
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const { name, brand, category, price, image, sizes, stock } = req.body;
  if (!name || !brand || !category || !price) {
    return res.status(400).json({ error: 'name, brand, category and price are required.' });
  }

  db.prepare(
    'UPDATE products SET name=?, brand=?, category=?, price=?, image=?, sizes=?, stock=? WHERE id=?'
  ).run(name, brand, category, parseFloat(price), image || '', sizes || '', parseInt(stock) || 0, req.params.id);

  return res.json({ message: 'Product updated successfully.' });
});

// ─── DELETE /api/admin/products/:id ──────────────────────────────────────────
router.delete('/products/:id', (req, res) => {
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Product deleted.' });
});

module.exports = router;
