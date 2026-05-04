# GDA Sports — Systems Architecture

---

## 1. Overview

GDA Sports is a full-stack e-commerce web application for sports gear. It is built as a single-server Node.js application that serves both the REST API and the static frontend pages from the same Express server.

The project is delivered in two versions:

| Version | Folder | Features |
|---|---|---|
| **Task 1** | `Team-Project-main` | Core shop: browse, cart, orders, profiles, admin |
| **Task 2** | `Team-Project-Task2` | Task 1 + wishlist, reviews, email notifications, forgot/reset password |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│                                                             │
│   login-v2.html  dashboard-v2.html  product-v2.html        │
│   cart-v2.html   profile-v2.html    admin-v2.html          │
│   order-confirmation-v2.html        register-v2.html        │
│   [Task 2 only] wishlist-v2.html    forgot/reset-password   │
└───────────────────────┬─────────────────────────────────────┘
                        │  HTTP / REST API (/api/*)
                        │  Static files (HTML, JS, images)
┌───────────────────────▼─────────────────────────────────────┐
│                  EXPRESS SERVER (Node.js)                     │
│                   backend/server.js                          │
│                                                             │
│  Static Middleware ──► Serves all .html / .js / images      │
│                                                             │
│  API Routes:                                                │
│  ├── /api/auth       → register, login                      │
│  ├── /api/products   → list, search, sort, detail           │
│  ├── /api/cart       → add, update, remove, clear           │
│  ├── /api/orders     → place order, history                 │
│  ├── /api/admin      → manage products & users              │
│  ├── /api/wishlist   → toggle, list IDs   [Task 2]          │
│  ├── /api/reviews    → submit, list, delete [Task 2]        │
│  └── /api/reset      → forgot/reset password [Task 2]       │
└───────────────────────┬─────────────────────────────────────┘
                        │  sql.js (Pure-JS SQLite)
┌───────────────────────▼─────────────────────────────────────┐
│                   SQLite DATABASE                             │
│                   backend/gda.db                             │
│                                                             │
│  Tables: users, products, cart_items,                       │
│          orders, order_items, reviews,                      │
│          wishlist, password_reset_tokens                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS | No framework — pure browser JS |
| Backend | Node.js + Express.js | REST API + static file server |
| Database | SQLite via `sql.js` | Pure-JS, no native binaries needed |
| Auth | JWT (`jsonwebtoken`) | Stored in `localStorage` |
| Password hashing | `bcryptjs` | Salted hashing |
| Email (Task 2) | `nodemailer` + Mailtrap | SMTP, order confirmation & password reset |
| Deployment | Render.com | Free tier, Node.js web service |
| Version control | Git + GitHub | Auto-deploy on push |

---

## 4. Project File Structure

```
Team-Project-main/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── database.js            # DB init, seed, sql.js shim
│   ├── gda.db                 # SQLite database (auto-created)
│   ├── middleware/
│   │   └── auth.js            # JWT verifyToken middleware
│   ├── routes/
│   │   ├── auth.js            # POST /register, /login
│   │   ├── products.js        # GET /products, /products/:id
│   │   ├── cart.js            # GET/POST/PUT/DELETE cart
│   │   ├── orders.js          # POST /checkout, GET /history
│   │   ├── admin.js           # Admin CRUD for products/users
│   │   ├── wishlist.js        # [Task 2] toggle, ids
│   │   ├── reviews.js         # [Task 2] submit, list, delete
│   │   └── reset.js           # [Task 2] forgot/reset password
│   └── services/
│       └── email.js           # [Task 2] Nodemailer email service
│
├── *.html / *.js              # Frontend pages + scripts
├── images (*.webp, *.jpg...)  # Product images
├── logo.png / logo1.jpg       # Brand assets
├── package.json               # Dependencies + start script
└── .env                       # JWT_SECRET, SMTP credentials
```

---

## 5. REST API Reference

### Auth — `/api/auth`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Create new user account | ❌ |
| POST | `/api/auth/login` | Login, returns JWT token | ❌ |

### Products — `/api/products`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/products` | List products (filter/search/sort) | ❌ |
| GET | `/api/products/:id` | Single product detail | ❌ |

### Cart — `/api/cart`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/cart` | Get user's cart items | ✅ |
| POST | `/api/cart/add` | Add item (upserts quantity) | ✅ |
| PUT | `/api/cart/update/:id` | Change item quantity | ✅ |
| DELETE | `/api/cart/remove/:id` | Remove single item | ✅ |
| DELETE | `/api/cart/clear` | Empty entire cart | ✅ |

### Orders — `/api/orders`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/orders/checkout` | Place order, reduce stock, clear cart | ✅ |
| GET | `/api/orders/history` | User's past orders + items | ✅ |

### Admin — `/api/admin`
| Method | Endpoint | Description | Auth (admin) |
|---|---|---|---|
| GET | `/api/admin/products` | All products | ✅ |
| POST | `/api/admin/products` | Add product | ✅ |
| PUT | `/api/admin/products/:id` | Edit product | ✅ |
| DELETE | `/api/admin/products/:id` | Delete product | ✅ |
| GET | `/api/admin/users` | All users | ✅ |
| PUT | `/api/admin/users/:id/role` | Change user role | ✅ |
| GET | `/api/admin/orders` | All orders | ✅ |

### Wishlist — `/api/wishlist` *(Task 2 only)*
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/wishlist/toggle` | Add/remove product | ✅ |
| GET | `/api/wishlist` | Full wishlist | ✅ |
| GET | `/api/wishlist/ids` | Array of product IDs | ✅ |

### Reviews — `/api/reviews` *(Task 2 only)*
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/reviews` | Submit/update review | ✅ |
| GET | `/api/reviews/:productId` | All reviews for product | ❌ |
| GET | `/api/reviews/:productId/mine` | User's own review | ✅ |
| DELETE | `/api/reviews/:productId` | Delete own review | ✅ |

### Password Reset — `/api/reset` *(Task 2 only)*
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/reset/forgot` | Send reset email | ❌ |
| POST | `/api/reset/reset` | Set new password via token | ❌ |

---

## 6. Database Schema

### `users`
```sql
id            INTEGER PRIMARY KEY AUTOINCREMENT
fullname      TEXT    NOT NULL
email         TEXT    NOT NULL UNIQUE
password_hash TEXT    NOT NULL
role          TEXT    DEFAULT 'user'   -- 'user' | 'admin'
created_at    TEXT    DEFAULT (datetime('now'))
```

### `products`
```sql
id       INTEGER PRIMARY KEY AUTOINCREMENT
name     TEXT    NOT NULL
brand    TEXT    NOT NULL
category TEXT    NOT NULL   -- 'shoes' | 'clothing'
price    REAL    NOT NULL
image    TEXT    NOT NULL
sizes    TEXT    DEFAULT '' -- comma-separated e.g. 'S,M,L,XL'
stock    INTEGER DEFAULT 100
```

### `cart_items`
```sql
id           INTEGER PRIMARY KEY AUTOINCREMENT
user_id      INTEGER NOT NULL
product_id   INTEGER
product_name TEXT    NOT NULL
price        REAL    NOT NULL
quantity     INTEGER DEFAULT 1
size         TEXT    DEFAULT ''
```

### `orders`
```sql
id             INTEGER PRIMARY KEY AUTOINCREMENT
user_id        INTEGER NOT NULL
total          REAL    NOT NULL
payment_method TEXT    NOT NULL
full_name      TEXT
phone          TEXT
address        TEXT
city           TEXT
postal_code    TEXT
country        TEXT
created_at     TEXT    DEFAULT (datetime('now'))
```

### `order_items`
```sql
id           INTEGER PRIMARY KEY AUTOINCREMENT
order_id     INTEGER NOT NULL
product_name TEXT    NOT NULL
price        REAL    NOT NULL
quantity     INTEGER DEFAULT 1
size         TEXT    DEFAULT ''
```

### `reviews` *(Task 2)*
```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
product_id INTEGER NOT NULL
user_id    INTEGER NOT NULL
rating     INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5)
comment    TEXT    DEFAULT ''
created_at TEXT    DEFAULT (datetime('now'))
UNIQUE(product_id, user_id)   -- one review per user per product
```

### `wishlist` *(Task 2)*
```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
user_id    INTEGER NOT NULL
product_id INTEGER NOT NULL
UNIQUE(user_id, product_id)
```

### `password_reset_tokens` *(Task 2)*
```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
user_id    INTEGER NOT NULL
token      TEXT    NOT NULL UNIQUE
expires_at TEXT    NOT NULL   -- 1 hour expiry
used       INTEGER DEFAULT 0
```

---

## 7. Authentication Flow

```
User enters email + password
        │
        ▼
POST /api/auth/login
        │
        ▼
bcrypt.compare(password, hash)
        │
   ┌────▼────┐
   │ Match? │
   └────┬────┘
     Yes │                   No
        ▼                    ▼
jwt.sign({ id, role })   401 Unauthorized
        │
        ▼
JWT token returned to browser
        │
        ▼
Stored in localStorage as 'gda_token'
        │
        ▼
Every API request: Authorization: Bearer <token>
        │
        ▼
auth.js middleware: jwt.verify(token, JWT_SECRET)
        │
   ┌────▼────┐
   │ Valid? │
   └────┬────┘
     Yes │                   No
        ▼                    ▼
  req.user = { id, role }  401 Unauthorized
  Route handler runs
```

---

## 8. Order Checkout Flow

```
User clicks "Place Order"
        │
        ▼
POST /api/orders/checkout
  { items, total, payment_method, shipping_address }
        │
        ▼
  BEGIN TRANSACTION
        │
        ├── INSERT INTO orders (user, total, address...)
        │
        ├── For each item:
        │     INSERT INTO order_items
        │     UPDATE products SET stock = MAX(0, stock - qty)
        │
        ├── DELETE FROM cart_items WHERE user_id = ?
        │
  COMMIT TRANSACTION
        │
        ▼
  [Task 2] Send order confirmation email via Nodemailer
        │
        ▼
  Return order_id → frontend redirects to order-confirmation page
```

---

## 9. Deployment Architecture

```
Developer Machine
        │
        │  git push origin main
        ▼
GitHub Repository
(Okurios/GDA-Task1)
        │
        │  Webhook trigger (auto-detect push)
        ▼
Render.com Web Service
  - npm install
  - node backend/server.js
  - PORT assigned by Render (e.g. 10000)
  - JWT_SECRET set as env variable
        │
        ▼
https://gda-task1.onrender.com
```

**Notes:**
- The SQLite database is stored on Render's ephemeral filesystem — it resets on each redeploy. Products and the admin account are auto-seeded on startup.
- For persistent storage across deploys, a hosted PostgreSQL database (e.g. Neon, Supabase) would be required.

---

## 10. Feature Comparison

| Feature | Task 1 | Task 2 |
|---|---|---|
| User registration & login | ✅ | ✅ |
| Product browsing (search, filter, sort) | ✅ | ✅ |
| Shopping cart | ✅ | ✅ |
| Order checkout with shipping address | ✅ | ✅ |
| Order history (profile page) | ✅ | ✅ |
| Stock management (auto-reduce on purchase) | ✅ | ✅ |
| Admin panel (products, users, orders) | ✅ | ✅ |
| Product detail page | ✅ | ✅ |
| Wishlist | ❌ | ✅ |
| Product reviews & star ratings | ❌ | ✅ |
| Order confirmation email | ❌ | ✅ |
| Forgot / reset password via email | ❌ | ✅ |
| Advanced product filters (brand, size, price, rating) | ❌ | ✅ |

---

*Last updated: May 2026*
