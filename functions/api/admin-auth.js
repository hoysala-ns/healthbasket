// functions/api/admin-auth.js
// POST /api/admin-auth?action=login|change-password|setup

import { err, ok, cors, hashPassword, generateSalt, log, now } from './_utils.js';

export async function onRequestOptions() { return cors(); }

export async function onRequestPost({ request, env }) {
  const db     = env.DB;
  const url    = new URL(request.url);
  const action = url.searchParams.get('action');
  let body = {};
  try { body = await request.json(); } catch(_) {}

  // ── SETUP — initialise admin on first run ──
  if (action === 'setup') {
    const existing = await db.prepare('SELECT id FROM admins WHERE id=? AND password!=?')
      .bind('admin_default','__CHANGE_ME__').first();
    if (existing) return err('Admin already configured');
    const { username, password } = body;
    if (!username || !password) return err('Username and password required');
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    await db.prepare('UPDATE admins SET username=?,password=?,salt=?,last_login=? WHERE id=?')
      .bind(username, hash, salt, now(), 'admin_default').run();
    // Store admin secret in config table for API auth
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2,'0')).join('');
    await db.prepare("INSERT OR REPLACE INTO config (key,value,updated_at) VALUES ('admin_secret',?,?)")
      .bind(secret, now()).run();
    await log(db, { actorType:'admin', actorId:'admin_default', actorName:username, action:'admin_setup' });
    return ok({ secret }); // return once — store securely
  }

  // ── LOGIN ──
  if (action === 'login') {
    const { username, password } = body;
    if (!username || !password) return err('Credentials required');
    const admin = await db.prepare('SELECT * FROM admins WHERE username=?').bind(username).first();
    if (!admin) return err('Invalid credentials');
    // Handle first-time unset password
    if (admin.password === '__CHANGE_ME__') {
      return err('Admin not yet configured. Open /admin.html and complete setup first.');
    }
    const hash = await hashPassword(password, admin.salt || '');
    if (hash !== admin.password) return err('Invalid credentials');
    // Return the stored admin secret as the session key
    const secretRow = await db.prepare("SELECT value FROM config WHERE key='admin_secret'").first();
    if (!secretRow) return err('Admin secret not found. Run setup first.');
    await db.prepare('UPDATE admins SET last_login=? WHERE id=?').bind(now(), admin.id).run();
    await log(db, { actorType:'admin', actorId:admin.id, actorName:admin.username, action:'admin_login' });
    return ok({ secret: secretRow.value, admin: { id: admin.id, username: admin.username } });
  }

  // ── CHANGE PASSWORD ──
  if (action === 'change-password') {
    const adminKey = request.headers.get('X-Admin-Key');
    const stored   = await db.prepare("SELECT value FROM config WHERE key='admin_secret'").first();
    if (!adminKey || !stored || adminKey !== stored.value) return err('Unauthorised', 403);
    const { username, password } = body;
    if (!username || !password) return err('Username and password required');
    if (password.length < 6) return err('Password must be at least 6 characters');
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    await db.prepare('UPDATE admins SET username=?,password=?,salt=?,last_login=? WHERE id=?')
      .bind(username, hash, salt, now(), 'admin_default').run();
    await log(db, { actorType:'admin', action:'admin_password_changed' });
    return ok();
  }

  return err('Unknown action', 404);
}
