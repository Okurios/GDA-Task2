const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// All admin routes require login + admin role
router.use(verifyToken, requireAdmin);

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const userCount    = await db.prepare("SELECT COUNT(*) AS c FROM users WHERE role != 'admin'").get();
  const orderCount   = await db.prepare('SELECT COUNT(*) AS c FROM orders').get();
  const productCount = await db.prepare('SELECT COUNT(*) AS c FROM products').get();
  const revenue      = await db.prepare('SELECT COALESCE(SUM(total), 0) AS r FROM orders').get();

  return res.json({
    userCount:    userCount.c,
    orderCount:   orderCount.c,
    productCount: productCount.c,
    revenue:      parseFloat(revenue.r).toFixed(2)
  });
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const users = await db.prepare(
    'SELECT id, fullname, email, role, created_at FROM users ORDER BY created_at DESC'
  ).all();
  return res.json(users);
});

// ─── PUT /api/admin/users/:id/role ───────────────────────────────────────────
router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'user' or 'admin'." });
  }
  // Prevent removing own admin role
  if (parseInt(req.params.id) === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'You cannot remove your own admin role.' });
  }
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  return res.json({ message: `User role updated to ${role}.` });
});

// ─── DELETE /api/admin/users/:id ─────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  await db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  return res.json({ message: 'User deleted.' });
});

// ─── GET /api/admin/orders ────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  const orders = await db.prepare(`
    SELECT o.id, o.total, o.payment_method,
           o.delivery_method, o.delivery_fee, o.card_last4, o.paypal_email,
           o.full_name, o.phone, o.address, o.city, o.postal_code, o.country,
           o.created_at,
           u.fullname, u.email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `).all();

  const ordersWithItems = await Promise.all(orders.map(async order => {
    const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return { ...order, items };
  }));

  return res.json(ordersWithItems);
});

// ─── GET /api/admin/products ──────────────────────────────────────────────────
router.get('/products', async (req, res) => {
  const products = await db.prepare('SELECT * FROM products ORDER BY id').all();
  return res.json(products);
});

// ─── POST /api/admin/products ─────────────────────────────────────────────────
router.post('/products', async (req, res) => {
  const {
    name, brand, category, price,
    image = '', sizes = '', colors = '', gender = 'unisex',
    description = '', stock = 100
  } = req.body;

  if (!name || !brand || !category || !price) {
    return res.status(400).json({ error: 'name, brand, category and price are required.' });
  }

  const result = await db.prepare(
    'INSERT INTO products (name, brand, category, price, image, sizes, colors, gender, description, stock) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(name, brand, category, parseFloat(price), image, sizes, colors, gender, description, parseInt(stock));

  return res.status(201).json({ message: 'Product added successfully.', productId: result.lastInsertRowid });
});

// ─── PUT /api/admin/products/:id ─────────────────────────────────────────────
router.put('/products/:id', async (req, res) => {
  const product = await db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const { name, brand, category, price, image, sizes, colors, gender, description, stock } = req.body;
  if (!name || !brand || !category || !price) {
    return res.status(400).json({ error: 'name, brand, category and price are required.' });
  }

  await db.prepare(
    'UPDATE products SET name=?, brand=?, category=?, price=?, image=?, sizes=?, colors=?, gender=?, description=?, stock=? WHERE id=?'
  ).run(
    name, brand, category, parseFloat(price),
    image || '', sizes || '', colors || '', gender || 'unisex', description || '',
    parseInt(stock) || 0, req.params.id
  );

  return res.json({ message: 'Product updated successfully.' });
});

// ─── DELETE /api/admin/products/:id ──────────────────────────────────────────
router.delete('/products/:id', async (req, res) => {
  const product = await db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  await db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Product deleted.' });
});

module.exports = router;
