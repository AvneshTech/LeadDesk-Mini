'use strict';

/**
 * Authentication for the LeadDesk Mini admin area.
 *
 * Design:
 *  - Passwords are hashed with scrypt (Node's built-in crypto — no external dep),
 *    stored as "salt:hash". They are NEVER compared as plaintext strings.
 *  - Login creates a server-side session: a random opaque token stored in the
 *    `sessions` table and set as an httpOnly cookie. The cookie carries no
 *    user data, so sessions can be revoked and expire server-side.
 *  - The first admin user is bootstrapped from ADMIN_USERNAME / ADMIN_PASSWORD.
 */

const crypto = require('crypto');
const db = require('./db');

const COOKIE = 'ld_sid';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

// ---------- password hashing (scrypt) ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [salt, hash] = String(stored).split(':');
    const expected = Buffer.from(hash, 'hex');
    const actual = crypto.scryptSync(password, salt, 64);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch (_) {
    return false;
  }
}

// ---------- bootstrap first admin ----------
async function ensureAdminUser() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'DigitalHeroes!2024';
  const { rows } = await db.query('SELECT id FROM admin_users WHERE username = $1', [username]);
  if (rows.length === 0) {
    await db.query(
      'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)',
      [username, hashPassword(password)]
    );
    console.log(`Seeded admin user "${username}".`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log('  (Default password in use — set ADMIN_PASSWORD in production.)');
    }
  }
}

// ---------- cookie helpers (no external dep) ----------
function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function setSessionCookie(res, sid) {
  const secure = process.env.NODE_ENV === 'production';
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const parts = [
    `${COOKIE}=${sid}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

// ---------- session lifecycle ----------
async function createSession(userId) {
  const sid = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db.query(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
    [sid, userId, expires]
  );
  return sid;
}

async function getSessionUser(req) {
  const sid = parseCookies(req)[COOKIE];
  if (!sid) return null;
  const { rows } = await db.query(
    `SELECT s.id AS sid, s.expires_at, u.id AS user_id, u.username
       FROM sessions s JOIN admin_users u ON u.id = s.user_id
      WHERE s.id = $1`,
    [sid]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.query('DELETE FROM sessions WHERE id = $1', [sid]);
    return null;
  }
  return { id: row.user_id, username: row.username, sid: row.sid };
}

async function destroySession(req) {
  const sid = parseCookies(req)[COOKIE];
  if (sid) await db.query('DELETE FROM sessions WHERE id = $1', [sid]);
}

// ---------- express middleware ----------
function requireAuth() {
  return async (req, res, next) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });
    req.user = user;
    next();
  };
}

module.exports = {
  COOKIE,
  hashPassword,
  verifyPassword,
  ensureAdminUser,
  createSession,
  getSessionUser,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
};
