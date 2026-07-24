-- LeadDesk Mini — PostgreSQL schema
-- Run against your Postgres instance: psql "$DATABASE_URL" -f schema.sql

-- ---- Leads ----
CREATE TABLE IF NOT EXISTS leads (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  budget_range TEXT        NOT NULL,
  message      TEXT        NOT NULL DEFAULT '',
  status       TEXT        NOT NULL DEFAULT 'New'
                 CHECK (status IN ('New', 'Contacted', 'Closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status     ON leads (status);

-- ---- Admin auth ----
-- Passwords are never stored in plaintext. password_hash holds a
-- scrypt hash in the form "salt:hash" (see auth.js).
CREATE TABLE IF NOT EXISTS admin_users (
  id            BIGSERIAL PRIMARY KEY,
  username      TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server-side sessions. The cookie only carries an opaque random id;
-- all session state lives here so it can be revoked and expired.
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT        PRIMARY KEY,
  user_id    BIGINT      NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
