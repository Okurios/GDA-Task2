const express = require('express');
const router  = express.Router();
const db      = require('../database');

// ─── GET /api/products ───────────────────────────────────────────────────────
// Query params: ?q=  ?category=  ?brand=  ?sort=low|high
//               ?size=  ?minPrice=  ?maxPrice=  ?minRating=  ?inStock=1
router.get('/', async (req, res) => {
  const {
    q = '', category = '', gender = '', brand = '', sort = '',
    size = '', minPrice = '', maxPrice = '',
    minRating = '', inStock = ''
  } = req.query;

  let sql = `
    SELECT p.*,
      ROUND(COALESCE(AVG(r.rating), 0), 1) AS avg_rating,
      COUNT(r.id) AS review_count
    FROM products p
    LEFT JOIN reviews r ON r.product_id = p.id
    WHERE 1=1`;
  const params = [];

  if (category && category !== 'all') {
    sql += ' AND p.category = ?'; params.push(category);
  }
  if (gender && gender !== 'all') {
    if (gender === 'men' || gender === 'women') {
      sql += " AND (p.gender = ? OR p.gender = 'unisex')"; params.push(gender);
    } else {
      sql += ' AND p.gender = ?'; params.push(gender);
    }
  }
  if (brand) {
    sql += ' AND p.brand = ?'; params.push(brand);
  }
  if (q) {
    sql += ' AND (p.name LIKE ? OR p.brand LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (size) {
    // Match size as a whole token (comma-separated list)
    sql += ` AND (',' || p.sizes || ',' LIKE ?)`;
    params.push(`%,${size},%`);
  }
  if (minPrice !== '') {
    sql += ' AND p.price >= ?'; params.push(parseFloat(minPrice));
  }
  if (maxPrice !== '') {
    sql += ' AND p.price <= ?'; params.push(parseFloat(maxPrice));
  }
  if (inStock === '1') {
    sql += ' AND p.stock > 0';
  }

  sql += ' GROUP BY p.id';

  if (minRating !== '') {
    sql += ' HAVING avg_rating >= ?'; params.push(parseFloat(minRating));
  }

  if (sort === 'low')         sql += ' ORDER BY p.price ASC';
  else if (sort === 'high')   sql += ' ORDER BY p.price DESC';
  else if (sort === 'rating') sql += ' ORDER BY avg_rating DESC';
  else if (minRating !== '')  sql += ' ORDER BY avg_rating DESC';  // default when filtering by rating

  const products = await db.prepare(sql).all(...params);
  return res.json(products);
});

// ─── GET /api/products/brands  (distinct brand list for filter UI) ─────────
router.get('/brands', async (req, res) => {
  const rows = await db.prepare('SELECT DISTINCT brand FROM products ORDER BY brand').all();
  return res.json(rows.map(r => r.brand));
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const product = await db.prepare(`
    SELECT p.*,
      ROUND(COALESCE(AVG(r.rating), 0), 1) AS avg_rating,
      COUNT(r.id) AS review_count
    FROM products p
    LEFT JOIN reviews r ON r.product_id = p.id
    WHERE p.id = ?
    GROUP BY p.id
  `).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  return res.json(product);
});

module.exports = router;
