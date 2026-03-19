-- ─────────────────────────────────────────────────────────────────
-- Health Basket — D1 Database Schema
-- Run this once to initialise your database:
--   npx wrangler d1 execute healthbasket-db --remote --file=schema.sql
-- ─────────────────────────────────────────────────────────────────

-- ── CUSTOMERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  password    TEXT NOT NULL,
  salt        TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ── ADMIN USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id          TEXT PRIMARY KEY,
  username    TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  salt        TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  last_login  INTEGER
);

-- Insert default admin (username: admin, password: admin123)
-- Password will be re-hashed on first login via the app
-- This is a temporary plaintext marker — app replaces it on first use
INSERT OR IGNORE INTO admins (id, username, password, salt, created_at)
VALUES ('admin_default', 'admin', '__CHANGE_ME__', '', 0);

-- ── PRODUCTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  emoji         TEXT,
  price         REAL NOT NULL,
  original_price REAL,
  weight        TEXT,
  badge         TEXT,
  img           TEXT,
  description   TEXT,
  weights_json  TEXT,  -- JSON array of weight options
  tags_json     TEXT,  -- JSON array of tags
  nutrition_json TEXT, -- JSON object of nutrition info
  in_stock      INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ── ORDERS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  customer_id     TEXT,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  customer_email  TEXT,
  address         TEXT,
  address2        TEXT,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,
  items_json      TEXT NOT NULL,  -- JSON array of ordered items
  items_summary   TEXT,
  subtotal        REAL NOT NULL,
  delivery_fee    REAL NOT NULL DEFAULT 0,
  discount        REAL NOT NULL DEFAULT 0,
  promo_code      TEXT,
  total           REAL NOT NULL,
  payment_method  TEXT NOT NULL,
  delivery_type   TEXT NOT NULL DEFAULT 'standard',
  payment_id      TEXT,           -- Razorpay payment ID
  payment_status  TEXT DEFAULT 'pending',
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE INDEX IF NOT EXISTS idx_orders_customer  ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created   ON orders(created_at DESC);

-- ── ACTIVITY LOG ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_type  TEXT NOT NULL,  -- 'customer' | 'admin' | 'system'
  actor_id    TEXT,
  actor_name  TEXT,
  action      TEXT NOT NULL,  -- e.g. 'login', 'order_placed', 'status_changed'
  entity_type TEXT,           -- 'order' | 'product' | 'customer'
  entity_id   TEXT,
  detail      TEXT,           -- free-text detail
  ip          TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_log_actor    ON activity_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_log_action   ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_log_created  ON activity_log(created_at DESC);

-- ── SESSIONS ─────────────────────────────────────────────────────
-- Lightweight session store — each login creates a token
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_customer ON sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires  ON sessions(expires_at);

-- ── TELEGRAM CONFIG ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  INTEGER NOT NULL
);
