const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { verifyToken } = require('../middleware/auth');
const { sendEmail, orderConfirmationEmail } = require('../services/email');

router.use(verifyToken);

// ─── POST /api/orders ─────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { payment_method } = req.body;

  if (!payment_method) {
    return res.status(400).json({ error: 'Payment method is required.' });
  }

  const cartItems = db.prepare(
    'SELECT * FROM cart_items WHERE user_id = ?'
  ).all(req.user.id);

  if (cartItems.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  const total = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  const placeOrder = db.transaction(() => {
    const orderResult = db.prepare(
      'INSERT INTO orders (user_id, total, payment_method) VALUES (?, ?, ?)'
    ).run(req.user.id, total, payment_method);

    const orderId = orderResult.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_name, price, quantity, size) VALUES (?, ?, ?, ?, ?)'
    );

    for (const item of cartItems) {
      const qty = item.quantity || 1;
      insertItem.run(orderId, item.product_name, item.price, qty, item.size || '');

      // Decrease stock
      if (item.product_id) {
        db.prepare(
          'UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?'
        ).run(qty, item.product_id);
      }
    }

    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    return orderId;
  });

  const orderId = placeOrder();

  // Send order confirmation email (non-blocking)
  const user  = db.prepare('SELECT fullname, email FROM users WHERE id = ?').get(req.user.id);
  const order = { id: orderId, total, payment_method };
  sendEmail(
    user.email,
    `GDA Sports – Order #${orderId} Confirmed`,
    orderConfirmationEmail(user.fullname, order, cartItems)
  );

  return res.status(201).json({
    message: `Order completed successfully via ${payment_method}! Thank you!`,
    orderId,
    total: total.toFixed(2)
  });
});

// ─── GET /api/orders ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const orders = db.prepare(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);

  const ordersWithItems = orders.map(order => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return { ...order, items };
  });

  return res.json(ordersWithItems);
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const order = db.prepare(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  return res.json({ ...order, items });
});

module.exports = router;
