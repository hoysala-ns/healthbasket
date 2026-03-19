// functions/api/orders.js
// GET  /api/orders          — list all (admin) or own orders (customer)
// GET  /api/orders?id=xxx   — get single order
// POST /api/orders          — place new order
// PUT  /api/orders?id=xxx   — update status (admin)

import { err, ok, cors, log, verifySession, now } from './_utils.js';

export async function onRequestOptions() { return cors(); }

// ── POST — place order ─────────────────────────────────────────
export async function onRequestPost({ request, env }) {
  const db    = env.DB;
  const body  = await request.json();
  const { order } = body;
  if (!order) return err('Order data required');

  // Try to get logged-in customer
  const session = await verifySession(db, request);

  await db.prepare(`
    INSERT INTO orders
      (id,customer_id,customer_name,customer_phone,customer_email,
       address,address2,city,state,pincode,
       items_json,items_summary,subtotal,delivery_fee,discount,promo_code,
       total,payment_method,delivery_type,payment_id,payment_status,status,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    order.id,
    session ? session.customer_id : (order.customerId || null),
    order.customer.name,
    order.customer.phone || null,
    order.customer.email || null,
    order.customer.address || null,
    order.customer.address2 || null,
    order.customer.city || null,
    order.customer.state || null,
    order.customer.pincode || null,
    JSON.stringify(order.items),
    order.itemsSummary,
    order.subtotal,
    order.deliveryFee,
    order.discount || 0,
    order.promoCode || null,
    order.total,
    order.paymentMethod,
    order.deliveryType || 'standard',
    order.paymentId || null,
    order.paymentStatus || 'pending',
    'pending',
    now()
  ).run();

  await log(db, {
    actorType: session ? 'customer' : 'guest',
    actorId:   session ? session.customer_id : null,
    actorName: order.customer.name,
    action:    'order_placed',
    entityType:'order',
    entityId:  order.id,
    detail:    `Total: ₹${order.total} | ${order.itemsSummary}`
  });

  return ok({ orderId: order.id });
}

// ── GET — fetch orders ─────────────────────────────────────────
export async function onRequestGet({ request, env }) {
  const db  = env.DB;
  const url = new URL(request.url);
  const id  = url.searchParams.get('id');

  // Single order by ID (public — anyone with order ID can track)
  if (id) {
    const row = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
    if (!row) return err('Order not found', 404);
    return ok({ order: parseOrder(row) });
  }

  // Check if admin request
  const adminKey = request.headers.get('X-Admin-Key');
  const storedKey = await env.DB.prepare("SELECT value FROM config WHERE key='admin_secret'").first();
  const isAdmin = adminKey && storedKey && adminKey === storedKey.value;

  if (isAdmin) {
    const limit  = parseInt(url.searchParams.get('limit')  || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');
    let query = 'SELECT * FROM orders';
    const params = [];
    if (status) { query += ' WHERE status = ?'; params.push(status); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const { results } = await db.prepare(query).bind(...params).all();
    return ok({ orders: results.map(parseOrder) });
  }

  // Customer — return own orders
  const session = await verifySession(db, request);
  if (!session) return err('Authentication required', 401);
  const { results } = await db.prepare(
    'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC'
  ).bind(session.customer_id).all();
  return ok({ orders: results.map(parseOrder) });
}

// ── PUT — update status ────────────────────────────────────────
export async function onRequestPut({ request, env }) {
  const db   = env.DB;
  const url  = new URL(request.url);
  const id   = url.searchParams.get('id');
  const body = await request.json();
  if (!id) return err('Order ID required');

  const adminKey    = request.headers.get('X-Admin-Key');
  const storedKey   = await env.DB.prepare("SELECT value FROM config WHERE key='admin_secret'").first();
  const isAdmin     = adminKey && storedKey && adminKey === storedKey.value;
  if (!isAdmin) return err('Unauthorised', 403);

  const { status } = body;
  const validStatuses = ['pending','confirmed','dispatched','out_for_delivery','delivered','cancelled'];
  if (!validStatuses.includes(status)) return err('Invalid status');

  await db.prepare('UPDATE orders SET status=?, updated_at=? WHERE id=?')
    .bind(status, now(), id).run();

  await log(db, {
    actorType:'admin', action:'status_changed',
    entityType:'order', entityId:id, detail:`→ ${status}`
  });

  return ok({ message: 'Status updated' });
}

function parseOrder(row) {
  return {
    ...row,
    items:     JSON.parse(row.items_json || '[]'),
    customer: {
      name:    row.customer_name,
      phone:   row.customer_phone,
      email:   row.customer_email,
      address: row.address,
      address2:row.address2,
      city:    row.city,
      state:   row.state,
      pincode: row.pincode,
    },
    subtotal:    row.subtotal,
    deliveryFee: row.delivery_fee,
    discount:    row.discount,
    promoCode:   row.promo_code,
    total:       row.total,
    paymentMethod: row.payment_method,
    deliveryType:  row.delivery_type,
    status:        row.status,
    timestamp:     row.created_at,
    itemsSummary:  row.items_summary,
    id:            row.id,
    customerId:    row.customer_id,
  };
}
