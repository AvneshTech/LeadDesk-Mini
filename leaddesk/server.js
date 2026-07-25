'use strict';

require('dotenv').config();
// console.log('DATABASE_URL =', process.env.DATABASE_URL);

const express = require('express');
const path = require('path');
const db = require('./db');
const auth = require('./auth');
const { validateLead, BUDGET_RANGES, STATUSES } = require('./validation');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // correct Secure cookies behind a hosting proxy
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  try {
    const { rows } = await db.query(
      'SELECT id, username, password_hash FROM admin_users WHERE username = $1',
      [username]
    );
    const user = rows[0];
    // Always run verify to reduce timing differences; generic error message.
    const ok = user && auth.verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid username or password.' });

    const sid = await auth.createSession(user.id);
    auth.setSessionCookie(res, sid);
    return res.json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Login failed:', err.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

app.post('/api/admin/logout', async (req, res) => {
  await auth.destroySession(req);
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/admin/me', async (req, res) => {
  const user = await auth.getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated.' });
  res.json({ user: { id: user.id, username: user.username } });
});

// ---------- protected admin API ----------
app.get('/api/leads', auth.requireAuth(), async (req, res) => {
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
});

app.patch('/api/leads/:id/status', auth.requireAuth(), async (req, res) => {
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
});

// ---------- static + pages ----------
// (static comes after API so /api/* is never shadowed)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

async function start() {
  await db.init();
  await auth.ensureAdminUser();
  app.listen(PORT, () => {
    console.log(`LeadDesk Mini running on http://localhost:${PORT}`);
    console.log(`  Landing: http://localhost:${PORT}/`);
    console.log(`  Admin:   http://localhost:${PORT}/admin`);
    console.log(`  DB:      ${db.USE_MEM ? 'pg-mem (in-memory)' : 'PostgreSQL'}`);
  });
}

if (require.main === module) {
  start().catch((err) => { console.error('Failed to start:', err); process.exit(1); });
}

module.exports = { app, start };
