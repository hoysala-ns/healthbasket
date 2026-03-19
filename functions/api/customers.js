// functions/api/customers.js
// Admin-only customer management + activity log

import { err, ok, cors, now } from './_utils.js';

export async function onRequestOptions() { return cors(); }

async function isAdmin(request, env) {
  const key    = request.headers.get('X-Admin-Key');
  const stored = await env.DB.prepare("SELECT value FROM config WHERE key='admin_secret'").first();
  return key && stored && key === stored.value;
}

// GET /api/customers         — list customers
// GET /api/customers?log=1   — activity log
export async function onRequestGet({ request, env }) {
  if (!await isAdmin(request, env)) return err('Unauthorised', 403);
  const db  = env.DB;
  const url = new URL(request.url);

  if (url.searchParams.get('log') === '1') {
    const limit  = parseInt(url.searchParams.get('limit')  || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const { results } = await db.prepare(
      'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();
    return ok({ logs: results });
  }

  const { results } = await db.prepare(
    'SELECT id,name,email,phone,created_at FROM customers ORDER BY created_at DESC'
  ).all();

  // Attach order counts
  const enriched = await Promise.all(results.map(async c => {
    const stats = await db.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(total),0) as spent FROM orders WHERE customer_id=?'
    ).bind(c.id).first();
    return { ...c, orderCount: stats.count, totalSpent: stats.spent };
  }));

  return ok({ customers: enriched });
}
