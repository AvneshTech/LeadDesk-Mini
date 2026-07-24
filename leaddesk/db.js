'use strict';

/**
 * Database layer for LeadDesk Mini.
 *
 * Uses PostgreSQL via `pg` (node-postgres).
 *   - Production/real DB: set DATABASE_URL (Neon, Supabase, Railway, Render, local Postgres...).
 *   - Offline dev/demo:   set DB_DRIVER=mem to use an in-memory Postgres (pg-mem),
 *                         so the app runs with zero external setup.
 *
 * The rest of the app only ever calls `query(text, params)` and `init()`,
 * so the storage engine is fully swappable.
 */

const fs = require('fs');
const path = require('path');

const USE_MEM = process.env.DB_DRIVER === 'mem' || !process.env.DATABASE_URL;

let pool;

if (USE_MEM) {
  // ---- In-memory Postgres (pg-mem) : great for local demo / tests ----
  const { newDb } = require('pg-mem');
  const db = newDb();
  // pg-mem ships a drop-in `pg.Pool` adapter
  const { Pool } = db.adapters.createPg();
  pool = new Pool();
  // pg-mem lacks now()'s tz flavor edge cases but supports what we need.
} else {
  // ---- Real PostgreSQL ----
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Most hosted Postgres providers require SSL. Toggle with PGSSL=disable if not.
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  });
}

async function query(text, params) {
  return pool.query(text, params);
}

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

module.exports = { query, init, pool, USE_MEM };
