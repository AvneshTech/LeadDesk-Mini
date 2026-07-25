<div align="center">

# 🎯 LeadDesk Mini

### A production-ready lead-capture platform with a public landing page and a secured admin dashboard.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Open_App-2ea44f?style=flat-square)](https://leaddesk-mini-vewi.onrender.com/)
[![Admin Panel](https://img.shields.io/badge/🔐_Admin_Panel-Login-blue?style=flat-square)](https://leaddesk-mini-vewi.onrender.com/admin)
[![GitHub](https://img.shields.io/badge/⭐_Source-GitHub-181717?style=flat-square&logo=github)](https://github.com/AvneshTech/LeadDesk-Mini)

</div>

---

## 🔗 Live Links

| Resource | URL |
|----------|-----|
| 🌐 **Live Landing Page** | https://leaddesk-mini-5fq5.onrender.com |
| 🔐 **Admin Dashboard** | https://leaddesk-mini-5fq5.onrender.com/admin |
| 💻 **GitHub Repository** | https://github.com/AvneshTech/LeadDesk-Mini |

> **Built for Digital Heroes Training Task** — [digitalheroesco.com](https://digitalheroesco.com)

---

## 📖 Project Overview

**LeadDesk Mini** is a small but complete lead-management product that demonstrates a full end-to-end workflow: a visitor submits the public form → the lead lands in PostgreSQL → an authenticated admin reviews, searches, and moves it through a status pipeline (**New → Contacted → Closed**).

It was built across two tasks:

- **Task A** — end-to-end lead capture: public form with client + server validation, a real database, and an admin view with list / search / status toggle.
- **Task B** — "secure it and ship it": real admin login (hashed passwords + server-side sessions), free-tier deployment, and full documentation.

The app runs with **zero setup** out of the box (in-memory Postgres for demos) and switches to a **real PostgreSQL database** the moment you provide a `DATABASE_URL`.

---

## ✨ Features

### 🌐 Public Landing Page (`/`)
- Lead form capturing **name, email, budget range, message**
- ⚡ **Client-side validation** with instant inline errors
- 🛡️ **Server-side validation** — safe even if the form/JS is bypassed
- ✅ Success confirmation state after submission

### 🔐 Secured Admin Dashboard (`/admin`)
- 🔑 **Login required** — real username/password, **no hardcoded credentials**
- 📋 Lists all leads (newest first) with summary count cards
- 🔍 **Search** across name, email, and message (Postgres `ILIKE`)
- 🎚️ **Status filter** + one-click **status toggle**: New / Contacted / Closed
- 🚪 **Log out** — sessions expire automatically

### ⚙️ Backend
- 🟢 Node.js + Express REST API
- 🐘 **PostgreSQL** via `pg` — fully **parameterized queries** (no SQL injection)
- 🔒 **scrypt** password hashing + **server-side sessions** (opaque HttpOnly cookie)
- 🧪 Zero-setup **offline demo mode** using in-memory Postgres (`pg-mem`)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 18+ |
| **Web framework** | Express 4 |
| **Database** | PostgreSQL (Neon / Supabase / Railway / Render / local) |
| **DB driver** | `pg` (production) · `pg-mem` (offline demo) |
| **Auth** | Node built-in `crypto` (scrypt hashing + server-side sessions) |
| **Config** | `dotenv` |
| **Frontend** | Vanilla HTML + CSS + JavaScript (no build step) |
| **Deployment** | Render (Blueprint) · Railway |

---

## 🏗️ Architecture

```mermaid
flowchart LR
    subgraph Client["🌐 Browser"]
        LP["Landing Page<br/>index.html + app.js"]
        AD["Admin Dashboard<br/>admin.html + admin.js"]
    end

    subgraph Server["⚙️ Express Server (server.js)"]
        PUB["Public API<br/>POST /api/leads"]
        AUTH["Auth Middleware<br/>requireAuth"]
        PROT["Protected API<br/>GET /api/leads<br/>PATCH /api/leads/:id/status"]
        LOGIN["POST /api/admin/login<br/>POST /api/admin/logout"]
    end

    subgraph Data["🐘 PostgreSQL (db.js)"]
        L[("leads")]
        U[("admin_users")]
        S[("sessions")]
    end

    LP -->|submit form| PUB
    AD -->|login| LOGIN
    AD -->|"session cookie"| AUTH
    AUTH --> PROT
    PUB --> L
    LOGIN --> U
    LOGIN --> S
    PROT --> L
    AUTH --> S
```

**Request flow:** the public form posts leads without auth; every admin request carries an opaque session cookie that `requireAuth` validates against the `sessions` table before touching lead data.

---

## 📸 Screenshots


| Landing Page | Admin Dashboard |
|:---:|:---:|
| ![Landing Page](image/Landing.png) | ![Admin Dashboard](image/Admin.png) |

---

## 🔐 Authentication Flow

The requirement: _"real login… not a hardcoded string… sessions or tokens handled properly."_ Here's how it works:

```mermaid
sequenceDiagram
    participant A as Admin Browser
    participant S as Server
    participant DB as PostgreSQL

    A->>S: POST /api/admin/login (username, password)
    S->>DB: SELECT password_hash WHERE username=$1
    DB-->>S: scrypt salt:hash
    S->>S: verify with crypto.timingSafeEqual
    S->>DB: INSERT session (256-bit id, expires_at = now + 8h)
    S-->>A: Set-Cookie: sid (HttpOnly, SameSite=Lax, Secure in prod)
    A->>S: GET /api/leads (cookie)
    S->>DB: lookup session → valid & not expired?
    DB-->>S: user_id
    S-->>A: 200 leads  (or 401 if invalid/expired)
```

1. **Hashed passwords, never plaintext.** Admin credentials live in `admin_users`, stored as a **scrypt** hash (`salt:hash`) using Node's built-in `crypto`. Login verifies with a **constant-time** comparison (`crypto.timingSafeEqual`).
2. **Server-side sessions.** A random **256-bit** session id is stored in the `sessions` table with an **8h expiry** and returned in an **HttpOnly**, `SameSite=Lax` cookie (`Secure` in production). The cookie carries no user data — sessions can be revoked server-side and can't be forged client-side.
3. **Protected endpoints.** `GET /api/leads` and `PATCH /api/leads/:id/status` require a valid session (`requireAuth` → `401` otherwise). Public `POST /api/leads` stays open for the landing form.
4. **First admin bootstrap — no public signup (by design).** On startup the app seeds one admin from `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

### Managing admin logins

| Environment | Login |
|-------------|-------|
| `npm run dev` (offline) | `admin` / `DigitalHeroes!2024` (demo default) |
| Local `.env` | your `ADMIN_USERNAME` / `ADMIN_PASSWORD` |
| Render (blueprint) | `admin` / auto-generated password (Service → **Environment** tab) |

```bash
# Add another admin or change a password after deploy (no signup page by design):
node create-admin.js <username> <password>
# e.g.
node create-admin.js amit 'S0me-Strong-Pass!'
```
Passwords must be ≥ 8 characters and are always stored scrypt-hashed.

---

## 🛡️ Security Features

- ✅ **Parameterized SQL** everywhere — no string concatenation, no SQL injection
- ✅ **scrypt** password hashing (no plaintext, no external crypto dependency)
- ✅ **Constant-time** password comparison (`timingSafeEqual`)
- ✅ **Opaque server-side sessions** — HttpOnly, `SameSite=Lax`, `Secure` in production
- ✅ Automatic **session expiry** (8h) and server-side revocation on logout
- ✅ `trust proxy` enabled so `Secure` cookies work behind a hosting proxy
- ✅ Secrets kept in environment variables — `.env` and `node_modules/` are git-ignored

---

## 📡 REST API

| Method | Route | Auth | Purpose |
|--------|-------|:----:|---------|
| `GET` | `/api/health` | – | Health check + active DB driver |
| `GET` | `/api/config` | – | Budget ranges + statuses |
| `POST` | `/api/leads` | – | Create a lead (public form) |
| `POST` | `/api/admin/login` | – | Log in, sets session cookie |
| `POST` | `/api/admin/logout` | ✅ | Log out, clears session |
| `GET` | `/api/admin/me` | – | Current admin (or `401`) |
| `GET` | `/api/leads?search=&status=` | ✅ | List leads (+ summary counts) |
| `PATCH` | `/api/leads/:id/status` | ✅ | Update a lead's status |

<details>
<summary><strong>Example: create a lead</strong></summary>

```bash
curl -X POST https://leaddesk-mini-5fq5.onrender.com/api/leads \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "budget_range": "$5k–$10k",
    "message": "Interested in a project"
  }'
```
**Valid budget ranges:** `Under $1k` · `$1k–$5k` · `$5k–$10k` · `$10k–$50k` · `$50k+`
**Valid statuses:** `New` · `Contacted` · `Closed`
</details>

---

## 🗄️ Database Schema

<details open>
<summary><strong><code>leads</code></strong></summary>

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `name` | TEXT | required |
| `email` | TEXT | required, stored lowercase |
| `budget_range` | TEXT | required, from a fixed allow-list |
| `message` | TEXT | optional, ≤ 2000 chars |
| `status` | TEXT | `New` \| `Contacted` \| `Closed` (CHECK) |
| `created_at` | TIMESTAMPTZ | default `now()` |
| `updated_at` | TIMESTAMPTZ | default `now()` |
</details>

<details>
<summary><strong><code>admin_users</code></strong></summary>

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `username` | TEXT UNIQUE | required |
| `password_hash` | TEXT | scrypt `salt:hash` |
| `created_at` | TIMESTAMPTZ | default `now()` |
</details>

<details>
<summary><strong><code>sessions</code></strong></summary>

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | random 256-bit token (cookie) |
| `user_id` | BIGINT | → `admin_users.id` |
| `created_at` | TIMESTAMPTZ | default `now()` |
| `expires_at` | TIMESTAMPTZ | session expiry (8h) |
</details>

Indexes on `leads(created_at)`, `leads(status)`, and `sessions(expires_at)`.

---

## 🔧 Environment Variables

Copy `.env.example` → `.env` and set what you need. All are optional for the offline demo; `DATABASE_URL` is the only one required for a real deployment.

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `DATABASE_URL` | Yes (real DB) | — (uses `pg-mem`) | Postgres connection string. If unset, the app runs in-memory. |
| `PORT` | No | `3000` | HTTP port to listen on. |
| `NODE_ENV` | Recommended (prod) | `development` | Set to `production` so session cookies are `Secure`. |
| `ADMIN_USERNAME` | No | `admin` | Username for the first admin, seeded on startup. |
| `ADMIN_PASSWORD` | Recommended | `your_secure_password` | Password for the first admin (stored scrypt-hashed). |
| `PGSSL` | No | enabled | Set to `disable` for a local Postgres without SSL. |
| `DB_DRIVER` | No | auto | Set to `mem` to force in-memory `pg-mem`. |

---

## 📋 Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | **18 or newer** | Enforced via `engines` in `package.json` |
| **npm** | **9+** | Ships with Node 18+ |
| **PostgreSQL** | any modern Postgres | e.g. **Neon** free tier. Optional — offline mode uses `pg-mem` |

---

## 🚀 Installation & Local Development

### Option A — Offline demo (no database needed)

```bash
git clone https://github.com/AvneshTech/LeadDesk-Mini.git
cd LeadDesk-Mini
npm install
npm run dev        # in-memory Postgres (pg-mem) — zero setup
```
- Landing: http://localhost:3000
- Admin: http://localhost:3000/admin
- Default login: `admin` / `DigitalHeroes!2024`

Load sample leads: `DB_DRIVER=mem npm run seed`

### Option B — With a real PostgreSQL database

```bash
cp .env.example .env          # then set DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD
psql "$DATABASE_URL" -f schema.sql   # optional — app also runs it on startup
npm start
```

---

## 🐘 Neon PostgreSQL Setup

1. Create a free project at **[neon.tech](https://neon.tech/)**.
2. Copy the connection string — it looks like:
   ```
   postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Paste it into `DATABASE_URL` in your `.env` (or your host's environment).
4. Start the app — the schema is created automatically on first boot.

---

## ☁️ Render Deployment

This repo ships a `render.yaml` blueprint that provisions a **free web service + free Postgres** in one commit.

1. Push the repo to GitHub.
2. Render → **New → Blueprint** → select the repo → **Apply**.
3. Render creates the database, wires `DATABASE_URL`, and generates a strong `ADMIN_PASSWORD` (view it under the service's **Environment** tab). `ADMIN_USERNAME` defaults to `admin`.
4. Open the service URL → landing at `/`, admin at `/admin`.

> **Fresh-browser check:** open the deployed `/admin` in a private window — you should see the login screen, and leads only load after signing in. That confirms there's no local state.

---

## 📁 Folder Structure

```text
LeadDesk-Mini/
├── server.js         # Express app + routes (public + protected)
├── auth.js           # scrypt hashing, sessions, login middleware
├── db.js             # Postgres / pg-mem data layer
├── validation.js     # Server-side validation (mirrors client)
├── schema.sql        # PostgreSQL schema (leads, admin_users, sessions)
├── seed.js           # Sample leads (npm run seed)
├── create-admin.js   # Create/update an admin login (no signup by design)
├── package.json
├── package-lock.json
├── Procfile          # web: node server.js
├── render.yaml       # Render blueprint (web + free Postgres)
├── .env.example
├── .gitignore
├── README.md
├── WALKTHROUGH.md    # Loom recording script (form → status change)
└── public/
    ├── index.html    # Landing page
    ├── admin.html    # Admin (login gate + dashboard)
    ├── styles.css
    ├── app.js        # Landing form + client validation
    └── admin.js      # Login/logout + search/filter/status toggle
```

---

## 🔮 Future Enhancements

- ⏳ Loading spinners during login and lead submission
- 📄 Pagination on the admin leads table
- 🕒 Human-friendly localized timestamps
- 📧 Email uniqueness validation
- 🚦 Rate limiting on the public form
- 📊 Consistent JSON error envelope across all endpoints
- 🔔 Email/Slack notification on new lead

---

## 👤 Author

**Avnesh Kumar**

[![GitHub](https://img.shields.io/badge/GitHub-AvneshTech-181717?style=flat-square&logo=github)](https://github.com/AvneshTech)

Project: [LeadDesk-Mini](https://github.com/AvneshTech/LeadDesk-Mini)

---

## 📄 License

NONE.

---

<div align="center">

**Built for Digital Heroes Training Task** — [digitalheroesco.com](https://digitalheroesco.com)

⭐ If you found this useful, consider starring the [repository](https://github.com/AvneshTech/LeadDesk-Mini)!

</div>
