# Loom Walkthrough Script — LeadDesk Mini

A 2–3 minute recording that walks the full flow: **form submission → status change**.
Record with [Loom](https://www.loom.com) (screen + optional mic). Keep the deployed URL in the address bar so it's visible.

---

## Before you hit record
- Open your **deployed** site (not localhost) so the URL proves it's live.
- Have two tabs ready: the **landing page** (`/`) and the **admin** (`/admin`).
- Know your test credentials (e.g. `admin` / the password from your host's env vars).

---

## Script

**0:00 — Intro (15s)**
> "This is LeadDesk Mini, a lead-capture app I built for the Digital Heroes task.
> It's live at [read the URL]. Let me walk through it end to end — Postgres-backed,
> with a secured admin area."

**0:15 — Public landing + validation (40s)**
- Show the landing page and the footer credit linking to digitalheroesco.com.
- Click **Send inquiry** with empty fields → point out the **inline client-side validation**.
- Type an invalid email → show the email error.
> "Validation runs on the client for UX, and again on the server so the API is safe even
> if someone bypasses the form."
- Fill it properly: name, email, a **budget range**, a message → **Submit** → show the
  "Thank you" confirmation.

**0:55 — The data is really stored (20s)**
> "That submission just went into PostgreSQL via a parameterized insert."
- (Optional) open `/api/health` to show the DB driver is `postgres`.

**1:15 — Admin is protected (35s)**
- Open `/admin` (ideally in a **fresh/incognito window**) → the **login screen** appears.
> "The admin area isn't a hardcoded password — credentials are a scrypt hash in the database,
> and login creates a server-side session stored in an HttpOnly cookie."
- Try a **wrong password** → show the "Invalid username or password" error.
- Log in with the correct credentials → dashboard loads.

**1:50 — Manage leads: search + status change (45s)**
- Point out the **summary cards** (Total / New / Contacted / Closed).
- **Search** for the lead you just submitted (by name or email) → it appears.
- Change its **status** from *New* → *Contacted* → watch the pill color change and the
  count cards update.
- Change the **status filter** to *Contacted* → the list narrows.
> "Status changes persist immediately through a protected PATCH endpoint."

**2:35 — Log out + wrap (15s)**
- Click **Log out** → back to the login screen. Refreshing `/api/leads` would now 401.
> "Sessions can be revoked and expire automatically. That's the full loop:
> public submission, stored in Postgres, secured admin, and status management. Thanks!"

---

## Checklist to mention/show
- [ ] Live URL visible in the address bar
- [ ] Footer credit → digitalheroesco.com
- [ ] Client + server validation
- [ ] Real login (wrong password rejected)
- [ ] Search working
- [ ] Status toggle persisting
- [ ] Log out returns to the gate
