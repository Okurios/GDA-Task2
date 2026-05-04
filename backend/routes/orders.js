const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { verifyToken } = require('../middleware/auth');
const { sendEmail, orderConfirmationEmail } = require('../services/email');

router.use(verifyToken);

// ─── POST /api/orders ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    payment_method,
    delivery_method = 'standard',
    delivery_fee = 0,
    card_last4 = '',
    paypal_email = '',
    full_name, phone, address, city, postal_code, country
  } = req.body;

  if (!payment_method) {
    return res.status(400).json({ error: 'Payment method is required.' });
  }
  if (!full_name || !address || !city || !postal_code || !country) {
    return res.status(400).json({ error: 'Please fill in all shipping address fields.' });
  }

  const cartItems = await db.prepare(
    'SELECT * FROM cart_items WHERE user_id = ?'
  ).all(req.user.id);

  if (cartItems.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  const itemsTotal = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const total = itemsTotal + parseFloat(delivery_fee || 0);

  // Insert order
  const orderResult = await db.prepare(
    `INSERT INTO orders
      (user_id, total, payment_method, delivery_method, delivery_fee, card_last4, paypal_email,
       full_name, phone, address, city, postal_code, country)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    req.user.id, total, payment_method,
    delivery_method, parseFloat(delivery_fee || 0), card_last4 || '', paypal_email || '',
    full_name, phone || '', address, city, postal_code, country
  );

  const orderId = orderResult.lastInsertRowid;

  // Insert order items
  for (const item of cartItems) {
    const qty = item.quantity || 1;
    await db.prepare(
      'INSERT INTO order_items (order_id, product_name, price, quantity, size, color) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(orderId, item.product_name, item.price, qty, item.size || '', item.color || '');

    // Decrease stock
    if (item.product_id) {
      await db.prepare(
        'UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?'
      ).run(qty, item.product_id);
    }
  }

  // Clear cart
  await db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);

  // Send order confirmation email (non-blocking)
  const user  = await db.prepare('SELECT fullname, email FROM users WHERE id = ?').get(req.user.id);
  const order = { id: orderId, total, payment_method, delivery_method, delivery_fee, full_name, phone, address, city, postal_code, country };
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
router.get('/', async (req, res) => {
  const orders = await db.prepare(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);

  const ordersWithItems = await Promise.all(orders.map(async order => {
    const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return { ...order, items };
  }));

  return res.json(ordersWithItems);
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const order = await db.prepare(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  return res.json({ ...order, items });
});

module.exports = router;
