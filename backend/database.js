/**
 * database.js  –  Pure-JS SQLite via sql.js (no native compilation required)
 * v2: adds quantity, size, stock, role, admin seeding, product size migration
 */

const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'gda.db');

let sqliteDb = null;
let _inTx    = false;

// ─── Persistence helper ──────────────────────────────────────────────────────
function saveToFile() {
  if (_inTx || !sqliteDb) return;
  const buf = sqliteDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(buf));
}

// ─── Low-level query helpers ─────────────────────────────────────────────────
function sqlAll(sql, params) {
  const stmt = sqliteDb.prepare(sql);
  if (params && params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function sqlGet(sql, params) {
  const rows = sqlAll(sql, params);
  return rows.length ? rows[0] : undefined;
}

function sqlRun(sql, params) {
  sqliteDb.run(sql, params || []);
  const meta = sqlAll('SELECT last_insert_rowid() AS lastInsertRowid, changes() AS changes', []);
  saveToFile();
  return {
    lastInsertRowid: meta[0] ? meta[0].lastInsertRowid : 0,
    changes:         meta[0] ? meta[0].changes         : 0
  };
}

function normalise(args) {
  if (args.length === 0) return [];
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

// ─── better-sqlite3 compatibility shim ──────────────────────────────────────
const db = {
  prepare(sql) {
    return {
      get:  (...args) => sqlGet (sql, normalise(args)),
      all:  (...args) => sqlAll (sql, normalise(args)),
      run:  (...args) => sqlRun (sql, normalise(args)),
    };
  },
  exec(sql) {
    sqliteDb.exec(sql);
    saveToFile();
  },
  transaction(fn) {
    return (...args) => {
      _inTx = true;
      sqliteDb.run('BEGIN');
      try {
        const result = fn(...args);
        sqliteDb.run('COMMIT');
        _inTx = false;
        saveToFile();
        return result;
      } catch (e) {
        sqliteDb.run('ROLLBACK');
        _inTx = false;
        throw e;
      }
    };
  },
  pragma() {}
};

// ─── Database initialisation ─────────────────────────────────────────────────
async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    sqliteDb = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    sqliteDb = new SQL.Database();
  }

  // ── Create base tables ────────────────────────────────────────────────────
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      fullname      TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    DEFAULT 'user',
      created_at    TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT    NOT NULL,
      brand    TEXT    NOT NULL,
      category TEXT    NOT NULL,
      price    REAL    NOT NULL,
      image    TEXT    NOT NULL,
      sizes    TEXT    DEFAULT '',
      stock    INTEGER DEFAULT 100
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL,
      product_id   INTEGER,
      product_name TEXT    NOT NULL,
      price        REAL    NOT NULL,
      quantity     INTEGER DEFAULT 1,
      size         TEXT    DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS orders (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL,
      total          REAL    NOT NULL,
      payment_method TEXT    NOT NULL,
      created_at     TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id     INTEGER NOT NULL,
      product_name TEXT    NOT NULL,
      price        REAL    NOT NULL,
      quantity     INTEGER DEFAULT 1,
      size         TEXT    DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      token      TEXT    NOT NULL UNIQUE,
      expires_at TEXT    NOT NULL,
      used       INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id    INTEGER NOT NULL,
      rating     INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment    TEXT    DEFAULT '',
      created_at TEXT    DEFAULT (datetime('now')),
      UNIQUE(product_id, user_id)
    );
  `);

  // ── Migrations: add new columns to pre-existing tables ───────────────────
  const migrations = [
    "ALTER TABLE users       ADD COLUMN role     TEXT    DEFAULT 'user'",
    "ALTER TABLE products    ADD COLUMN sizes    TEXT    DEFAULT ''",
    "ALTER TABLE products    ADD COLUMN stock    INTEGER DEFAULT 100",
    "ALTER TABLE cart_items  ADD COLUMN quantity INTEGER DEFAULT 1",
    "ALTER TABLE cart_items  ADD COLUMN size     TEXT    DEFAULT ''",
    "ALTER TABLE order_items ADD COLUMN quantity INTEGER DEFAULT 1",
    "ALTER TABLE order_items ADD COLUMN size     TEXT    DEFAULT ''",
  ];
  for (const m of migrations) {
    try { sqliteDb.run(m); } catch (e) { /* column already exists – skip */ }
  }

  // ── Seed products (only on fresh DB) ─────────────────────────────────────
  const count = sqlAll('SELECT COUNT(*) AS c FROM products', [])[0].c;
  if (count === 0) {
    const products = [
      ["NIKE Running Shoe 'REVOLUTION 8' in White",                        'Nike',          'shoes',    64.99, 'image 1.webp',  '38,39,40,41,42,43,44,45', 50],
      ["Men's Sneakers St Runner V4 Grey/White",                           'Puma',          'shoes',    40.00, 'image 2.webp',  '38,39,40,41,42,43,44,45', 60],
      ['Men\'s T-Shirt for Gym "The Gym"',                                 'Take Position', 'clothing', 19.99, 'image 3.jpeg', 'S,M,L,XL,XXL',            80],
      ['Football Socks Blue',                                              'Givova',        'clothing',  8.00, 'image 4.webp',  'One Size',                100],
      ["England Home 2026 Stadium Men's Shirt",                            'Nike',          'clothing', 99.99, 'image 5.avif', 'S,M,L,XL,XXL',             30],
      ["Nike Atletico Madrid FC 2025/26 3rd Home Men's Football Shirt",    'Nike',          'clothing', 75.00, 'image 6.webp',  'S,M,L,XL,XXL',            40],
      ['Shirt Givova One',                                                 'Givova',        'clothing',  9.90, 'image 7.webp',  'S,M,L,XL,XXL',            90],
      ["Men's Sneakers Anthracite - Nike V5 RNR",                         'Nike',          'shoes',    85.00, 'image 8.webp',  '38,39,40,41,42,43,44,45', 35],
      ['ADIDAS MILANO 23 SOCK ROY',                                       'Adidas',        'clothing',  8.00, 'image 9.webp',  'One Size',                100],
      ["ADIDAS PERFORMANCE Sports jersey 'FIGC TR JSY' in White",         'Adidas',        'clothing', 55.00, 'image 10.webp', 'S,M,L,XL,XXL',            45],
    ];
    sqliteDb.run('BEGIN');
    for (const [name, brand, category, price, image, sizes, stock] of products) {
      sqliteDb.run(
        'INSERT INTO products (name, brand, category, price, image, sizes, stock) VALUES (?,?,?,?,?,?,?)',
        [name, brand, category, price, image, sizes, stock]
      );
    }
    sqliteDb.run('COMMIT');
    console.log('✅  Database seeded with 10 products.');
  }

  // ── Assign sizes to existing products that have none ─────────────────────
  const noSizes = sqlAll("SELECT * FROM products WHERE sizes IS NULL OR sizes = ''", []);
  for (const p of noSizes) {
    let sizes = 'S,M,L,XL,XXL';
    if (p.category === 'shoes') sizes = '38,39,40,41,42,43,44,45';
    else if (p.name && (p.name.includes('Sock') || p.name.includes('SOCK'))) sizes = 'One Size';
    sqliteDb.run('UPDATE products SET sizes = ? WHERE id = ?', [sizes, p.id]);
  }

  // ── Seed admin user if none exists ────────────────────────────────────────
  const adminExists = sqlAll("SELECT id FROM users WHERE role = 'admin'", []);
  if (adminExists.length === 0) {
    const adminHash = bcrypt.hashSync('Admin1234!', 10);
    try {
      sqliteDb.run(
        "INSERT OR IGNORE INTO users (fullname, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
        ['GDA Admin', 'admin@gda.com', adminHash]
      );
      console.log('✅  Admin user seeded  →  admin@gda.com  /  Admin1234!');
    } catch (e) { /* already exists */ }
  }

  saveToFile();
  console.log('✅  Database ready  →  ' + DB_PATH);
  return db;
}

module.exports = db;
module.exports.initDatabase = initDatabase;
