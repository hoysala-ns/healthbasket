// functions/api/products.js
// GET  /api/products        — list products (public)
// POST /api/products        — add product (admin)
// PUT  /api/products?id=N   — update product (admin)
// DELETE /api/products?id=N — delete product (admin)

import { err, ok, cors, log, now } from './_utils.js';

export async function onRequestOptions() { return cors(); }

async function isAdmin(request, env) {
  const key = request.headers.get('X-Admin-Key');
  const stored = await env.DB.prepare("SELECT value FROM config WHERE key='admin_secret'").first();
  return key && stored && key === stored.value;
}

export async function onRequestGet({ request, env }) {
  const db  = env.DB;
  const url = new URL(request.url);
  const id  = url.searchParams.get('id');

  if (id) {
    const row = await db.prepare('SELECT * FROM products WHERE id=?').bind(id).first();
    if (!row) return err('Product not found', 404);
    return ok({ product: parseProduct(row) });
  }

  const cat = url.searchParams.get('category');
  let q = 'SELECT * FROM products WHERE in_stock=1';
  const params = [];
  if (cat) { q += ' AND category=?'; params.push(cat); }
  q += ' ORDER BY id ASC';
  const { results } = await db.prepare(q).bind(...params).all();
  return ok({ products: results.map(parseProduct) });
}

export async function onRequestPost({ request, env }) {
  if (!await isAdmin(request, env)) return err('Unauthorised', 403);
  const db   = env.DB;
  const body = await request.json();
  const { product } = body;
  if (!product?.name || !product?.price) return err('Name and price required');

  const result = await db.prepare(`
    INSERT INTO products
      (name,category,emoji,price,original_price,weight,badge,img,description,
       weights_json,tags_json,nutrition_json,in_stock,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?)
  `).bind(
    product.name, product.category||'dals', product.emoji||'🌾',
    product.price, product.originalPrice||null, product.weight||'1 kg',
    product.badge||null, product.img||'', product.desc||'',
    JSON.stringify(product.weights||[]), JSON.stringify(product.tags||[]),
    JSON.stringify(product.nutrition||{}), now()
  ).run();

  await log(env.DB, { actorType:'admin', action:'product_added', entityType:'product', detail:product.name });
  return ok({ id: result.meta.last_row_id });
}

export async function onRequestPut({ request, env }) {
  if (!await isAdmin(request, env)) return err('Unauthorised', 403);
  const db   = env.DB;
  const url  = new URL(request.url);
  const id   = url.searchParams.get('id');
  if (!id) return err('ID required');
  const body = await request.json();
  const p    = body.product;

  // Handle stock toggle only
  if (body.inStock !== undefined) {
    await db.prepare('UPDATE products SET in_stock=?, updated_at=? WHERE id=?')
      .bind(body.inStock ? 1 : 0, now(), id).run();
    return ok();
  }

  await db.prepare(`
    UPDATE products SET
      name=?,category=?,emoji=?,price=?,original_price=?,weight=?,badge=?,img=?,
      description=?,weights_json=?,tags_json=?,nutrition_json=?,updated_at=?
    WHERE id=?
  `).bind(
    p.name, p.category, p.emoji||'🌾', p.price, p.originalPrice||null,
    p.weight||'1 kg', p.badge||null, p.img||'', p.desc||'',
    JSON.stringify(p.weights||[]), JSON.stringify(p.tags||[]),
    JSON.stringify(p.nutrition||{}), now(), id
  ).run();

  await log(env.DB, { actorType:'admin', action:'product_updated', entityType:'product', entityId:String(id), detail:p.name });
  return ok();
}

export async function onRequestDelete({ request, env }) {
  if (!await isAdmin(request, env)) return err('Unauthorised', 403);
  const db  = env.DB;
  const url = new URL(request.url);
  const id  = url.searchParams.get('id');
  if (!id) return err('ID required');
  await db.prepare('DELETE FROM products WHERE id=?').bind(id).run();
  await log(env.DB, { actorType:'admin', action:'product_deleted', entityType:'product', entityId:String(id) });
  return ok();
}

function parseProduct(row) {
  return {
    id:            row.id,
    name:          row.name,
    category:      row.category,
    emoji:         row.emoji || '🌾',
    price:         row.price,
    originalPrice: row.original_price,
    weight:        row.weight,
    badge:         row.badge,
    img:           row.img,
    desc:          row.description,
    weights:       JSON.parse(row.weights_json || '[]'),
    tags:          JSON.parse(row.tags_json    || '[]'),
    nutrition:     JSON.parse(row.nutrition_json || '{}'),
    inStock:       row.in_stock === 1,
  };
}
