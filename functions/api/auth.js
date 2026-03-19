// functions/api/auth.js
// POST /api/auth?action=register|login|logout|me

import { json, err, ok, cors, hashPassword, generateSalt, generateToken, log, verifySession, now } from './_utils.js';

const SESSION_HOURS = 24; // session lasts 24 hours

export async function onRequestOptions() { return cors(); }

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  let body = {};
  try { body = await request.json(); } catch(_) {}

  // ── REGISTER ──────────────────────────────────────────────────
  if (action === 'register') {
    const { name, email, phone, password } = body;
    if (!name || !email || !password)
      return err('Name, email and password are required');
    if (password.length < 6)
      return err('Password must be at least 6 characters');

    // Check duplicate email
    const existing = await db.prepare('SELECT id FROM customers WHERE email = ?')
      .bind(email.toLowerCase().trim()).first();
    if (existing) return err('Email already registered');

    // Check duplicate phone
    if (phone) {
      const existingPhone = await db.prepare('SELECT id FROM customers WHERE phone = ?')
        .bind(phone.replace(/\D/g,'')).first();
      if (existingPhone) return err('Phone number already registered');
    }

    const id   = 'C' + now();
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    await db.prepare(
      `INSERT INTO customers (id,name,email,phone,password,salt,created_at)
       VALUES (?,?,?,?,?,?,?)`
    ).bind(id, name.trim(), email.toLowerCase().trim(),
           phone ? phone.replace(/\D/g,'') : null, hash, salt, now()).run();

    // Create session
    const token     = generateToken();
    const expiresAt = now() + SESSION_HOURS * 3600 * 1000;
    await db.prepare('INSERT INTO sessions (token,customer_id,created_at,expires_at) VALUES (?,?,?,?)')
      .bind(token, id, now(), expiresAt).run();

    await log(db, { actorType:'customer', actorId:id, actorName:name, action:'register' });

    return ok({ token, customer: { id, name, email: email.toLowerCase(), phone } });
  }

  // ── LOGIN ──────────────────────────────────────────────────────
  if (action === 'login') {
    const { identifier, password } = body;
    if (!identifier || !password) return err('Credentials required');

    const input = identifier.trim();
    const isPhone = /^[\d\s\-\+\(\)]+$/.test(input) && !input.includes('@');
    let customer;
    if (isPhone) {
      const digits = input.replace(/\D/g,'');
      customer = await db.prepare('SELECT * FROM customers WHERE phone = ?').bind(digits).first();
    } else {
      customer = await db.prepare('SELECT * FROM customers WHERE email = ?')
        .bind(input.toLowerCase()).first();
    }

    if (!customer) return err('No account found with this email or phone');

    const hash = await hashPassword(password, customer.salt || '');
    if (hash !== customer.password) return err('Incorrect password');

    // Create session
    const token     = generateToken();
    const expiresAt = now() + SESSION_HOURS * 3600 * 1000;
    await db.prepare('INSERT INTO sessions (token,customer_id,created_at,expires_at) VALUES (?,?,?,?)')
      .bind(token, customer.id, now(), expiresAt).run();

    await log(db, { actorType:'customer', actorId:customer.id, actorName:customer.name, action:'login' });

    return ok({ token, customer: { id:customer.id, name:customer.name, email:customer.email, phone:customer.phone } });
  }

  // ── LOGOUT ─────────────────────────────────────────────────────
  if (action === 'logout') {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token) {
      await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    }
    return ok({ message: 'Logged out' });
  }

  // ── UPDATE PASSWORD ────────────────────────────────────────────
  if (action === 'update-password') {
    const { email, newPassword } = body;
    if (!email || !newPassword) return err('Email and new password required');
    if (newPassword.length < 6) return err('Password must be at least 6 characters');

    const customer = await db.prepare('SELECT id FROM customers WHERE email = ?')
      .bind(email.toLowerCase()).first();
    if (!customer) return err('Account not found');

    const salt = generateSalt();
    const hash = await hashPassword(newPassword, salt);
    await db.prepare('UPDATE customers SET password=?, salt=?, updated_at=? WHERE email=?')
      .bind(hash, salt, now(), email.toLowerCase()).run();

    await log(db, { actorType:'customer', actorId:customer.id, action:'password_reset' });
    return ok({ message: 'Password updated' });
  }

  return err('Unknown action', 404);
}

// GET /api/auth?action=me — return current user from token
export async function onRequestGet({ request, env }) {
  const db = env.DB;
  const url = new URL(request.url);
  if (url.searchParams.get('action') === 'me') {
    const session = await verifySession(db, request);
    if (!session) return err('Not authenticated', 401);
    return ok({ customer: { id:session.customer_id, name:session.name, email:session.email, phone:session.phone } });
  }
  return err('Not found', 404);
}
