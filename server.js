'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const db = require('./db');
const auth = require('./auth');
const { validateLead, BUDGET_RANGES, STATUSES } = require('./validation');

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 3000);
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const loginAttempts = new Map();

app.set('trust proxy', 1); // correct Secure cookies behind a hosting proxy
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function getLoginAttemptKey(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0] : null);
  return `${ip || req.ip || req.socket.remoteAddress || 'unknown'}`;
}

function pruneExpiredLoginAttempts(now = Date.now()) {
  for (const [key, entry] of loginAttempts.entries()) {
    if (!entry || entry.resetAt <= now) {
      loginAttempts.delete(key);
    }
  }
}

function checkLoginRateLimit(req, res) {
  pruneExpiredLoginAttempts();
  const key = getLoginAttemptKey(req);
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 0, resetAt: now + LOGIN_ATTEMPT_WINDOW_MS });
    return true;
  }

  if (entry.count >= LOGIN_ATTEMPT_LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    return false;
  }

  return true;
}

function recordFailedLogin(req) {
  const key = getLoginAttemptKey(req);
  const now = Date.now();
  const entry = loginAttempts.get(key) || { count: 0, resetAt: now + LOGIN_ATTEMPT_WINDOW_MS };
  if (entry.resetAt <= now) {
    entry.count = 0;
    entry.resetAt = now + LOGIN_ATTEMPT_WINDOW_MS;
  }
  entry.count += 1;
  loginAttempts.set(key, entry);
  return entry;
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function resetLoginAttempts(req) {
  loginAttempts.delete(getLoginAttemptKey(req));
}

// ---------- public API ----------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, driver: db.USE_MEM ? 'pg-mem (in-memory)' : 'postgres' });
});

app.get('/api/config', (req, res) => {
  res.json({ budget_ranges: BUDGET_RANGES, statuses: STATUSES });
});

// Create a lead (public landing form — intentionally unauthenticated)
app.post('/api/leads', async (req, res) => {
  const { valid, errors, data } = validateLead(req.body || {});
  if (!valid) return res.status(422).json({ error: 'Validation failed', fields: errors });
  try {
    const result = await db.query(
      `INSERT INTO leads (name, email, budget_range, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, budget_range, message, status, created_at`,
      [data.name, data.email, data.budget_range, data.message]
    );
    return res.status(201).json({ lead: result.rows[0] });
  } catch (err) {
    console.error('Create lead failed:', err.message);
    return res.status(500).json({ error: 'Could not save lead.' });
  }
});

// ---------- auth API ----------
app.post('/api/admin/login', async (req, res) => {
  const username = (req.body && req.body.username || '').toString().trim();
  const password = (req.body && req.body.password || '').toString();
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (!checkLoginRateLimit(req, res)) return;
  try {
    const { rows } = await db.query(
      'SELECT id, username, password_hash FROM admin_users WHERE username = $1',
      [username]
    );
    const user = rows[0];
    // Always run verify to reduce timing differences; generic error message.
    const ok = user && auth.verifyPassword(password, user.password_hash);
    if (!ok) {
      recordFailedLogin(req);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    resetLoginAttempts(req);
    const sid = await auth.createSession(user.id);
    auth.setSessionCookie(res, sid);
    return res.json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Login failed:', err.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

app.post('/api/admin/logout', asyncHandler(async (req, res) => {
  await auth.destroySession(req);
  auth.clearSessionCookie(res);
  res.json({ ok: true });
}));

app.get('/api/admin/me', asyncHandler(async (req, res) => {
  const user = await auth.getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated.' });
  res.json({ user: { id: user.id, username: user.username } });
}));

// ---------- protected admin API ----------
app.get('/api/leads', auth.requireAuth(), asyncHandler(async (req, res) => {
  const search = (req.query.search || '').toString().trim();
  const status = (req.query.status || '').toString().trim();
  const where = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    where.push(`(name ILIKE ${p} OR email ILIKE ${p} OR message ILIKE ${p})`);
  }
  if (status && STATUSES.includes(status)) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  try {
    const result = await db.query(
      `SELECT id, name, email, budget_range, message, status, created_at
         FROM leads ${clause}
        ORDER BY created_at DESC, id DESC`,
      params
    );
    const counts = await db.query(`SELECT status, COUNT(*)::int AS n FROM leads GROUP BY status`);
    const summary = { New: 0, Contacted: 0, Closed: 0, total: 0 };
    for (const row of counts.rows) { summary[row.status] = row.n; summary.total += row.n; }
    return res.json({ leads: result.rows, summary });
  } catch (err) {
    console.error('List leads failed:', err.message);
    return res.status(500).json({ error: 'Could not load leads.' });
  }
}));

app.patch('/api/leads/:id/status', auth.requireAuth(), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const status = (req.body && req.body.status || '').toString().trim();
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid lead id.' });
  if (!STATUSES.includes(status)) {
    return res.status(422).json({ error: `Status must be one of: ${STATUSES.join(', ')}` });
  }
  try {
    const result = await db.query(
      `UPDATE leads SET status = $1, updated_at = now()
        WHERE id = $2
        RETURNING id, name, email, budget_range, message, status, created_at`,
      [status, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Lead not found.' });
    return res.json({ lead: result.rows[0] });
  } catch (err) {
    console.error('Update status failed:', err.message);
    return res.status(500).json({ error: 'Could not update status.' });
  }
}));

// ---------- static + pages ----------
// (static comes after API so /api/* is never shadowed)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled request error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error.' });
});

async function start(port = DEFAULT_PORT) {
  await db.init();
  await auth.ensureAdminUser();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`LeadDesk Mini running on http://localhost:${port}`);
      console.log(`  Landing: http://localhost:${port}/`);
      console.log(`  Admin:   http://localhost:${port}/admin`);
      console.log(`  DB:      ${db.USE_MEM ? 'pg-mem (in-memory)' : 'PostgreSQL'}`);
      resolve(server);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        if (port === DEFAULT_PORT) {
          console.warn(`Port ${port} is busy; trying ${port + 1} instead.`);
          server.close();
          resolve(start(port + 1));
          return;
        }
        console.error(`Port ${port} is already in use. Stop the existing process or set PORT to another value.`);
      } else {
        console.error('Failed to start:', err);
      }
      reject(err);
    });
  });
}

if (require.main === module) {
  start().catch((err) => {
    if (err && err.code !== 'EADDRINUSE') {
      console.error('Failed to start:', err);
    }
    process.exit(1);
  });
}

module.exports = { app, start };
