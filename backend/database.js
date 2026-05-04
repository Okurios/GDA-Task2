/**
 * database.js  –  Turso (hosted SQLite via @libsql/client)
 * Drop-in replacement for the sql.js version.
 * All db.prepare().get/all/run() methods are now async.
 */

const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const client = createClient({
  url:       process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

function normalise(args) {
  if (args.length === 0) return [];
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

const db = {
  prepare(sql) {
    return {
      async get(...args) {
        const { rows } = await client.execute({ sql, args: normalise(args) });
        return rows.length ? rows[0] : undefined;
      },
      async all(...args) {
        const { rows } = await client.execute({ sql, args: normalise(args) });
        return rows;
      },
      async run(...args) {
        const r = await client.execute({ sql, args: normalise(args) });
        return {
          lastInsertRowid: Number(r.lastInsertRowid || 0),
          changes:         r.rowsAffected,
        };
      },
    };
  },
  // transaction: returns an async function wrapping fn
  transaction(fn) {
    return (...args) => fn(...args);
  },
  pragma() {},
};

async function initDatabase() {
  // ── Create tables ────────────────────────────────────────────────────────
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      fullname      TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    DEFAULT 'user',
      created_at    TEXT    DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      brand       TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      gender      TEXT    DEFAULT 'unisex',
      price       REAL    NOT NULL,
      image       TEXT    NOT NULL,
      sizes       TEXT    DEFAULT '',
      colors      TEXT    DEFAULT '',
      stock       INTEGER DEFAULT 100,
      description TEXT    DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS cart_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL,
      product_id   INTEGER,
      product_name TEXT    NOT NULL,
      price        REAL    NOT NULL,
      quantity     INTEGER DEFAULT 1,
      size         TEXT    DEFAULT '',
      color        TEXT    DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL,
      total           REAL    NOT NULL,
      payment_method  TEXT    NOT NULL,
      delivery_method TEXT    DEFAULT 'standard',
      delivery_fee    REAL    DEFAULT 0,
      card_last4      TEXT    DEFAULT '',
      paypal_email    TEXT    DEFAULT '',
      full_name       TEXT    DEFAULT '',
      phone           TEXT    DEFAULT '',
      address         TEXT    DEFAULT '',
      city            TEXT    DEFAULT '',
      postal_code     TEXT    DEFAULT '',
      country         TEXT    DEFAULT '',
      created_at      TEXT    DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id     INTEGER NOT NULL,
      product_name TEXT    NOT NULL,
      price        REAL    NOT NULL,
      quantity     INTEGER DEFAULT 1,
      size         TEXT    DEFAULT '',
      color        TEXT    DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS wishlist (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      UNIQUE(user_id, product_id)
    )`,
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      token      TEXT    NOT NULL UNIQUE,
      expires_at TEXT    NOT NULL,
      used       INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS reviews (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id    INTEGER NOT NULL,
      rating     INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment    TEXT    DEFAULT '',
      created_at TEXT    DEFAULT (datetime('now')),
      UNIQUE(product_id, user_id)
    )`,
  ];

  for (const sql of tables) {
    await client.execute(sql);
  }

  // ── Seed products ────────────────────────────────────────────────────────
  const { rows: countRows } = await client.execute('SELECT COUNT(*) AS c FROM products');
  if (Number(countRows[0].c) === 0) {
    const products = [
      // [name, brand, category, gender, price, image, sizes, colors, stock, description]
      ["NIKE Running Shoe 'REVOLUTION 8' in White", 'Nike', 'shoes', 'men', 64.99, 'image 1.webp', '38,39,40,41,42,43,44,45', 'White,Black,Grey', 50, "The Nike Revolution 8 delivers a smooth, cushioned ride for everyday runs. Its lightweight mesh upper provides breathability while the foam midsole absorbs impact on road and track surfaces."],
      ["Men's Sneakers St Runner V4 Grey/White", 'Puma', 'shoes', 'men', 40.00, 'image 2.webp', '38,39,40,41,42,43,44,45', 'Grey,White,Black', 60, "The Puma ST Runner V4 combines retro court styling with modern comfort. The durable rubber outsole and padded collar make it ideal for both casual wear and light training sessions."],
      ['Men\'s T-Shirt for Gym "The Gym"', 'Take Position', 'clothing', 'men', 19.99, 'image 3.jpeg', 'S,M,L,XL,XXL', 'Black,Navy,Grey', 80, "Crafted from a moisture-wicking polyester blend, this gym T-shirt keeps you dry during intense workouts. The relaxed fit allows full range of motion for weightlifting and cardio training."],
      ['Football Socks Blue', 'Givova', 'clothing', 'unisex', 8.00, 'image 4.webp', 'One Size', 'Blue,White,Black', 100, "Givova's football socks feature a reinforced heel and toe for extended durability on the pitch. The ribbed compression band keeps the sock securely in place throughout the match."],
      ["England Home 2026 Stadium Men's Shirt", 'Nike', 'clothing', 'men', 99.99, 'image 5.avif', 'S,M,L,XL,XXL', 'White', 30, "The official England 2026 Stadium home shirt uses Nike Dri-FIT technology to pull sweat away from the skin. Inspired by the nation's football heritage, it features the iconic Three Lions crest."],
      ["Nike Atletico Madrid FC 2025/26 3rd Home Men's Football Shirt", 'Nike', 'clothing', 'men', 75.00, 'image 6.webp', 'S,M,L,XL,XXL', 'Red,Blue,White', 40, "Atletico Madrid's 2025/26 third kit is engineered with Nike Dri-FIT ADV fabric for superior sweat management. The bold graphic design draws inspiration from the club's passionate fan culture."],
      ['Givova One Training Shirt', 'Givova', 'clothing', 'unisex', 9.90, 'image 7.webp', 'S,M,L,XL,XXL', 'Red,Blue,Green,Yellow,Black,White', 90, "The Givova One is a versatile training shirt made from lightweight polyester interlock fabric. Its minimalist design and affordable price make it a go-to choice for team kits and casual training."],
      ["Nike V5 RNR Men's Sneakers in Anthracite", 'Nike', 'shoes', 'men', 85.00, 'image 8.webp', '38,39,40,41,42,43,44,45', 'Anthracite,Black,White', 35, "The Nike V5 RNR features a rugged outsole with enhanced grip for versatile terrain performance. The anthracite colourway pairs a premium mesh upper with durable overlays for street-ready durability."],
      ['Adidas Milano 23 Performance Socks', 'Adidas', 'clothing', 'unisex', 8.00, 'image 9.webp', 'One Size', 'White,Black,Blue', 100, "Adidas Milano 23 socks are constructed with a terry-lined footbed for extra cushioning and comfort. The elasticated arch support reduces foot fatigue during extended match play."],
      ["Adidas FIGC Italy Training Jersey in White", 'Adidas', 'clothing', 'men', 55.00, 'image 10.webp', 'S,M,L,XL,XXL', 'White,Blue', 45, "The official Italy FIGC training jersey is crafted with Adidas AEROREADY moisture-absorbing technology. Lightweight interlock fabric ensures comfort during pre-match warm-ups and tactical sessions."],
      ["Nike Air Zoom Women's Training Shoe", 'Nike', 'shoes', 'women', 79.99, 'image 1.webp', '36,37,38,39,40,41,42', 'White,Pink,Black', 45, "The Nike Air Zoom Women's trainer features a Zoom Air unit in the forefoot for responsive cushioning on every stride. The engineered mesh upper adapts to the foot's natural shape for a secure, comfortable fit."],
      ["Women's Dri-FIT Training T-Shirt", 'Adidas', 'clothing', 'women', 24.99, 'image 3.jpeg', 'XS,S,M,L,XL', 'Black,White,Pink', 70, "This women's training tee is made with Adidas AEROREADY technology that manages moisture to keep you feeling dry. The slim-cut silhouette and soft fabric make it equally suitable for the gym and casual wear."],
      ["Women's Pro Running Shorts", 'Nike', 'clothing', 'women', 34.99, 'image 7.webp', 'XS,S,M,L,XL', 'Black,Blue,Pink', 55, "Designed for high-intensity runs, these Nike women's shorts feature a built-in liner and Dri-FIT fabric for maximum comfort. The secure waistband with internal drawcord ensures a personalised, stay-put fit."],
      ["Puma Carina Women's Lifestyle Sneaker", 'Puma', 'shoes', 'women', 55.00, 'image 2.webp', '36,37,38,39,40,41', 'White,Pink,Black', 50, "The Puma Carina blends retro tennis aesthetics with everyday wearability. Its leather-look upper and cushioned SoftFoam+ sockliner deliver all-day comfort for both active and casual occasions."],
      ["Women's Compression Training Socks", 'Givova', 'clothing', 'women', 10.00, 'image 4.webp', 'S/M,L/XL', 'White,Black,Blue', 80, "Givova's women's compression socks provide graduated pressure to improve circulation and reduce muscle fatigue during long training sessions. The seamless toe construction minimises friction and blister risk."],
      ["Men's Pro Training Shorts", 'Nike', 'clothing', 'men', 29.99, 'image 7.webp', 'S,M,L,XL,XXL', 'Black,Navy,Grey', 65, "Built for the gym floor or the track, these Nike men's training shorts feature a lightweight Dri-FIT fabric and elastic waistband. Deep side pockets and a secure fit make them a reliable choice for any workout."],
      ["Adidas Tiro 23 Men's Training Jacket", 'Adidas', 'clothing', 'men', 65.00, 'image 10.webp', 'S,M,L,XL,XXL', 'Black,Navy,Green', 40, "The Adidas Tiro 23 jacket is a staple of the training ground, featuring AEROREADY technology and stretch-woven fabric for unrestricted movement. Side pockets and a full zip make it practical for warm-up and cool-down."],
      ["Women's High-Waist Yoga Leggings", 'Nike', 'clothing', 'women', 49.99, 'image 3.jpeg', 'XS,S,M,L,XL', 'Black,Navy,Grey,Purple', 60, "These Nike high-waist leggings feature a wide supportive waistband and Dri-FIT fabric for yoga, pilates and light training. The four-way stretch construction allows a full range of motion in every pose."],
      ["Adidas Ultraboost Women's Running Shoe", 'Adidas', 'shoes', 'women', 95.00, 'image 8.webp', '36,37,38,39,40,41,42', 'White,Black,Pink', 30, "Adidas Ultraboost delivers an energy-returning Boost midsole engineered for long-distance running comfort. The Primeknit+ upper wraps the foot in a sock-like fit that adapts with every stride."],
      ["Puma Men's King Top Firm Ground Boot", 'Puma', 'shoes', 'men', 89.99, 'image 2.webp', '39,40,41,42,43,44,45', 'Black,White', 25, "The Puma King Top is a legendary football boot rebuilt for the modern game. Its premium K-leather upper delivers exceptional touch and ball control, while the conical stud configuration provides reliable traction on firm ground."],
    ];

    const stmts = products.map(([name, brand, category, gender, price, image, sizes, colors, stock, description]) => ({
      sql:  'INSERT INTO products (name, brand, category, gender, price, image, sizes, colors, stock, description) VALUES (?,?,?,?,?,?,?,?,?,?)',
      args: [name, brand, category, gender, price, image, sizes, colors, stock, description],
    }));
    await client.batch(stmts, 'write');
    console.log('✅  Database seeded with 20 products.');
  }

  // ── Seed admin ───────────────────────────────────────────────────────────
  const { rows: adminRows } = await client.execute("SELECT id FROM users WHERE role = 'admin'");
  if (adminRows.length === 0) {
    const adminHash = bcrypt.hashSync('Admin1234!', 10);
    await client.execute({
      sql:  "INSERT OR IGNORE INTO users (fullname, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
      args: ['GDA Admin', 'admin@gda.com', adminHash],
    });
    console.log('✅  Admin user seeded  →  admin@gda.com  /  Admin1234!');
  }

  console.log('✅  Connected to Turso database.');
  return db;
}

module.exports = db;
module.exports.initDatabase = initDatabase;
