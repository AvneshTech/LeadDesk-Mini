# 🎥 Loom Walkthrough Script — LeadDesk Mini

> **Digital Heroes Training Task**  
> A **2–3 minute** end-to-end walkthrough demonstrating the complete workflow:
>
> **Lead Submission → PostgreSQL Storage → Secure Admin Login → Lead Status Management**

📹 **Record with:** https://www.loom.com

> **Tip:** Keep the deployed application URL visible in the browser throughout the recording to verify the live deployment.

---

# ✅ Before You Hit Record

✔ Open your **deployed application** (not localhost)

✔ Keep the URL visible in the address bar

✔ Open two browser tabs:

- 🌐 Landing Page (`/`)
- 🔐 Admin Dashboard (`/admin`)

✔ Keep your admin credentials ready

```
Username : admin
Password : ********
```

✔ Use an Incognito window for demonstrating authentication (Recommended)

---

# 🎬 Walkthrough Script

---

## ✅ 0:00 — Introduction (15 Seconds)

> "This is **LeadDesk Mini**, a lead-capture application I built for the **Digital Heroes Training Task**.
>
> It's live at **[Read the deployed URL]**.
>
> Let me walk you through the complete workflow—from lead submission to secure admin management, powered by PostgreSQL."

---

## ✅ 0:15 — Public Landing Page + Validation (40 Seconds)

### Show

✔ Landing Page

✔ Responsive Design

✔ Contact Form

✔ Footer credit linking to **digitalheroesco.com**

---

### Validation Demo

Click

```
Send Inquiry
```

without filling any fields.

✔ Show inline validation errors.

Now type

```
abc@
```

as the email.

✔ Show email validation.

Say

> "Validation runs on the client for a better user experience and again on the server to ensure API security, even if someone bypasses the frontend."

---

### Submit a Lead

Fill the form

```
Name

John Doe

Email

john@example.com

Budget

$5,000–$10,000

Message

Interested in your services.
```

Click

```
Submit
```

✔ Show the **Thank You** confirmation.

---

## ✅ 0:55 — The Data Is Really Stored (20 Seconds)

Say

> "That submission has now been securely stored in PostgreSQL using a parameterized SQL insert."

(Optional)

Open

```
/api/health
```

Show

```
driver: postgres
```

---

## ✅ 1:15 — Admin Is Protected (35 Seconds)

Open

```
/admin
```

Preferably in a fresh Incognito window.

✔ Login page appears.

Say

> "The admin area is protected. Credentials are securely stored as scrypt password hashes in PostgreSQL, and authentication uses server-side sessions with HttpOnly cookies."

---

### Wrong Password Demo

Login using an incorrect password.

✔ Show

```
Invalid username or password
```

---

### Correct Login

Login using the correct credentials.

✔ Dashboard loads successfully.

---

## ✅ 1:50 — Manage Leads (45 Seconds)

Point out

✔ Total Leads

✔ New Leads

✔ Contacted

✔ Closed

summary cards.

---

### Search

Search the lead using

- Name

or

- Email

✔ Matching lead appears.

---

### Change Status

Update

```
New
      ↓
Contacted
```

✔ Badge color changes.

✔ Summary cards update.

---

### Filter

Select

```
Contacted
```

✔ List narrows correctly.

Say

> "Status changes are persisted immediately through a protected PATCH endpoint."

---

## ✅ 2:35 — Logout + Wrap Up (15 Seconds)

Click

```
Logout
```

✔ Return to Login Page.

(Optional)

Refresh

```
/api/leads
```

✔ Receive

```
401 Unauthorized
```

Say

> "Sessions can be revoked at any time and automatically expire. This completes the full workflow—public submission, PostgreSQL storage, secure authentication, and lead management. Thank you."

---

# ✅ Recording Checklist

| Status | Task |
|--------|------|
| ✅ | Live deployed URL visible in browser |
| ✅ | Landing page demonstrated |
| ✅ | Footer credit → digitalheroesco.com |
| ✅ | Responsive UI shown |
| ✅ | Client-side validation |
| ✅ | Server-side validation explained |
| ✅ | Invalid email validation |
| ✅ | Successful form submission |
| ✅ | Thank You confirmation |
| ✅ | PostgreSQL storage explained |
| ✅ | `/api/health` endpoint shown *(Optional)* |
| ✅ | Secure Admin Login page |
| ✅ | Wrong password rejected |
| ✅ | Correct login successful |
| ✅ | Dashboard loaded |
| ✅ | Summary cards explained |
| ✅ | Lead search working |
| ✅ | Status updated successfully |
| ✅ | Badge color changes |
| ✅ | Summary counters updated |
| ✅ | Status filter working |
| ✅ | Protected PATCH endpoint explained |
| ✅ | Logout demonstrated |
| ✅ | Authentication gate restored |
| ✅ | 401 Unauthorized after logout *(Optional)* |
| ✅ | End-to-end workflow completed successfully |

---

# 🚀 Project Highlights

- ✅ Live Deployment
- ✅ PostgreSQL Database
- ✅ Secure Authentication
- ✅ HttpOnly Session Cookies
- ✅ Scrypt Password Hashing
- ✅ Protected REST APIs
- ✅ Client & Server Validation
- ✅ Search Functionality
- ✅ Lead Status Management
- ✅ Responsive Design
- ✅ Render Deployment
- ✅ Production Ready

---

# 🎯 Final Message

> "LeadDesk Mini demonstrates a complete production-ready workflow—from capturing leads on a public landing page to securely managing them through an authenticated admin dashboard. The application is backed by PostgreSQL, protected with secure authentication, and deployed live on Render. Thank you for watching!"