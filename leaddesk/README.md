# LeadDesk Mini

A small lead-capture product with a **public landing page** and a **secured admin dashboard**, backed by **PostgreSQL**.

> Built for Digital Heroes Training Task — https://digitalheroesco.com

**Task A** — end-to-end lead capture (public form → database → admin list/search/status).
**Task B** — real admin login (hashed passwords + server-side sessions), free-tier deployment, and docs.

---

## Features

**Public landing page (`/`)**
- Lead form: **name, email, budget range, message**
- **Client-side validation** (instant inline errors) + **server-side validation** (safe if JS/form bypassed)
- Success confirmation state

**Secured admin dashboard (`/admin`)**
- **Login required** — real username/password, no hardcoded credentials
- Lists all leads (newest first), with summary count cards
- **Search** across name, email, message (Postgres `ILIKE`)
- **Status filter** + **status toggle**: New / Contacted / Closed
- **Log out** button; sessions expire automatically

**Backend**
- Node.js + Express REST API
- **PostgreSQL** via `pg` (parameterized queries — no SQL injection)
- **scrypt** password hashing + **server-side sessions** (opaque httpOnly cookie)
- Zero-setup **offline demo mode** using in-memory Postgres (`pg-mem`)

---

## Authentication approach

The requirement: *"real login… not a hardcoded string… sessions or tokens handled properly."* How this app does it:

1. **Hashed passwords, never plaintext.**
   Admin credentials live in the `admin_users` table. The password is stored as a
   **scrypt** hash in the form `salt:hash` (Node's built-in `crypto`, no external dependency).
   Login verifies with a constant-time comparison (`crypto.timingSafeEqual`). There is no
   password string compared anywhere in the code.

2. **Server-side sessions (opaque cookie).**
   On successful login the server creates a random 256-bit session id, stores it in the
   `sessions` table with an expiry (8h), and returns it in an **HttpOnly**, `SameSite=Lax`
   cookie (`Secure` in production). The cookie carries **no user data** — it's just a lookup key —
   so sessions can be revoked server-side and can't be forged client-side.

3. **Protected endpoints.**
   `GET /api/leads` and `PATCH /api/leads/:id/status` require a valid session
   (`requireAuth` middleware → `401` otherwise). The **public** `POST /api/leads`
   stays open so anyone can submit the landing form. Logout deletes the session row
   and clears the cookie.

4. **First admin bootstrap.**
   On startup the app seeds one admin from `ADMIN_USERNAME` / `ADMIN_PASSWORD`
   (env vars). Rotate these per environment; the stored value is always hashed.

---

## Data model

**`leads`**
| Column         | Type          | Notes                                    |
|----------------|---------------|------------------------------------------|
| `id`           | BIGSERIAL PK  |                                          |
| `name`         | TEXT          | required                                 |
| `email`        | TEXT          | required, stored lowercase               |
| `budget_range` | TEXT          | required, from a fixed allow-list        |
| `message`      | TEXT          | optional, ≤ 2000 chars                   |
| `status`       | TEXT          | `New` \| `Contacted` \| `Closed` (CHECK) |
| `created_at`   | TIMESTAMPTZ   | default `now()`                          |
| `updated_at`   | TIMESTAMPTZ   | default `now()`                          |

**`admin_users`**
| Column          | Type         | Notes                          |
|-----------------|--------------|--------------------------------|
| `id`            | BIGSERIAL PK |                                |
| `username`      | TEXT UNIQUE  | required                       |
| `password_hash` | TEXT         | scrypt `salt:hash`             |
| `created_at`    | TIMESTAMPTZ  | default `now()`                |

**`sessions`**
| Column       | Type         | Notes                          |
|--------------|--------------|--------------------------------|
| `id`         | TEXT PK      | random 256-bit token (cookie)  |
| `user_id`    | BIGINT       | → `admin_users.id`             |
| `created_at` | TIMESTAMPTZ  | default `now()`                |
| `expires_at` | TIMESTAMPTZ  | session expiry (8h)            |

Indexes on `leads(created_at)`, `leads(status)`, and `sessions(expires_at)`.

---

## API

| Method | Route                        | Auth | Purpose                         |
|--------|------------------------------|------|---------------------------------|
| GET    | `/api/health`                | –    | Health + active DB driver       |
| GET    | `/api/config`                | –    | Budget ranges + statuses        |
| POST   | `/api/leads`                 | –    | Create a lead (public form)     |
| POST   | `/api/admin/login`           | –    | Log in, sets session cookie     |
| POST   | `/api/admin/logout`          | ✓    | Log out, clears session         |
| GET    | `/api/admin/me`              | –    | Current admin (or 401)          |
| GET    | `/api/leads?search=&status=` | ✓    | List leads (+ summary counts)   |
| PATCH  | `/api/leads/:id/status`      | ✓    | Update a lead's status          |

---

## Quick start (offline demo — no database needed)

```bash
npm install
npm run dev        # in-memory Postgres (pg-mem) — zero setup
# Landing: http://localhost:3000     Admin: http://localhost:3000/admin
# Default login: admin / DigitalHeroes!2024   (override with env vars)
```

Load sample leads: `DB_DRIVER=mem npm run seed` (in-memory data resets on restart).

## Run with a real PostgreSQL database

1. Create a Postgres DB (Neon / Supabase / Railway / Render).
2. Copy `.env.example` → `.env`, set `DATABASE_URL` (and `ADMIN_USERNAME` / `ADMIN_PASSWORD`).
   For a **local** Postgres without SSL, also set `PGSSL=disable`.
3. `psql "$DATABASE_URL" -f schema.sql` (optional — the app also runs it on startup).
4. `npm start`

---

## Deploy on a free tier

`DATABASE_URL` is the only required env var; set `NODE_ENV=production` so cookies are `Secure`.

### Option 1 — Render (blueprint, one commit)
This repo ships a `render.yaml` that provisions a free web service **and** a free Postgres:
1. Push the repo to GitHub.
2. Render → **New → Blueprint** → pick the repo → Apply.
3. Render creates the DB, wires `DATABASE_URL`, and generates a strong `ADMIN_PASSWORD`
   (view it under the service's *Environment* tab). `ADMIN_USERNAME` defaults to `admin`.
4. Open the service URL → landing at `/`, admin at `/admin`.

### Option 2 — Railway
1. New Project → Deploy from GitHub → add a **PostgreSQL** plugin.
2. Set variables: `DATABASE_URL` (from the plugin), `NODE_ENV=production`,
   `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
3. Railway runs `npm install` + the `Procfile` (`web: node server.js`).

**Fresh-browser check:** open the deployed `/admin` in a private window — you should see the
login screen, and leads only load after signing in. That confirms there's no local state.

---

## Push to GitHub

```bash
git init
git add .
git commit -m "LeadDesk Mini — secured + deployable"
git branch -M main
git remote add origin https://github.com/<you>/leaddesk-mini.git
git push -u origin main
```

`node_modules/` and `.env` are git-ignored.

---

## Loom walkthrough

A suggested 2–3 minute recording script is in **`WALKTHROUGH.md`** (form submission → status change).

---

## Project structure

```
leaddesk-mini/
├── server.js         # Express app + routes (public + protected)
├── auth.js           # scrypt hashing, sessions, login middleware
├── db.js             # Postgres / pg-mem data layer
├── validation.js     # Server-side validation (mirrors client)
├── schema.sql        # PostgreSQL schema (leads, admin_users, sessions)
├── seed.js           # Sample leads (npm run seed)
├── package.json
├── Procfile          # web: node server.js
├── render.yaml       # Render blueprint (web + free Postgres)
├── .env.example
└── public/
    ├── index.html    # Landing page
    ├── admin.html    # Admin (login gate + dashboard)
    ├── styles.css
    ├── app.js        # Landing form + client validation
    └── admin.js      # Login/logout + search/filter/status toggle
```
