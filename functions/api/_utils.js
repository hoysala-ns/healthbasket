// functions/api/_utils.js
// Shared helpers for all Pages Functions

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export function err(message, status = 400) {
  return json({ ok: false, error: message }, status);
}

export function ok(data = {}) {
  return json({ ok: true, ...data });
}

// Handle preflight CORS
export function cors() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// SHA-256 hash using Web Crypto (same algo as frontend)
export async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export function now() { return Date.now(); }

// Log an activity to the DB
export async function log(db, { actorType, actorId, actorName, action, entityType, entityId, detail }) {
  try {
    await db.prepare(
      `INSERT INTO activity_log (actor_type,actor_id,actor_name,action,entity_type,entity_id,detail,created_at)
       VALUES (?,?,?,?,?,?,?,?)`
    ).bind(actorType||'system', actorId||null, actorName||null, action,
           entityType||null, entityId||null, detail||null, now()).run();
  } catch(_) { /* non-fatal */ }
}

// Verify session token — returns customer row or null
export async function verifySession(db, request) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const session = await db.prepare(
    `SELECT s.*, c.name, c.email, c.phone FROM sessions s
     JOIN customers c ON c.id = s.customer_id
     WHERE s.token = ? AND s.expires_at > ?`
  ).bind(token, now()).first();
  return session || null;
}
