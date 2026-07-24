'use strict';

const STATUSES = ['New', 'Contacted', 'Closed'];

const loginView = document.getElementById('login-view');
const dashView = document.getElementById('dash-view');
const logoutBtn = document.getElementById('logout-btn');
const who = document.getElementById('who');

const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const loginStatus = document.getElementById('login-status');

const body = document.getElementById('leads-body');
const searchInput = document.getElementById('search');
const statusFilter = document.getElementById('status-filter');

// ---------- auth gating ----------
async function checkAuth() {
  try {
    const res = await fetch('/api/admin/me');
    if (res.ok) {
      const { user } = await res.json();
      showDashboard(user);
    } else {
      showLogin();
    }
  } catch (_) {
    showLogin();
  }
}

function showLogin() {
  loginView.hidden = false;
  dashView.hidden = true;
  logoutBtn.hidden = true;
}

function showDashboard(user) {
  loginView.hidden = true;
  dashView.hidden = false;
  logoutBtn.hidden = false;
  who.textContent = user.username;
  load();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginStatus.textContent = '';
  loginStatus.className = 'form-status';
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: loginForm.username.value,
        password: loginForm.password.value,
      }),
    });
    if (res.ok) {
      const { user } = await res.json();
      loginForm.reset();
      showDashboard(user);
    } else {
      const b = await res.json().catch(() => ({}));
      loginStatus.textContent = b.error || 'Sign in failed.';
      loginStatus.classList.add('err');
    }
  } catch (_) {
    loginStatus.textContent = 'Network error. Please try again.';
    loginStatus.classList.add('err');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign in';
  }
});

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

// ---------- leads dashboard ----------
function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
function esc(s) {
  return (s ?? '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function renderStats(summary) {
  document.querySelectorAll('[data-stat]').forEach((el) => {
    el.textContent = summary[el.getAttribute('data-stat')] ?? 0;
  });
}
function statusCell(lead) {
  const opts = STATUSES.map(
    (s) => `<option value="${s}" ${s === lead.status ? 'selected' : ''}>${s}</option>`
  ).join('');
  return `<select class="status-select status-${esc(lead.status)}" data-id="${lead.id}">${opts}</select>`;
}
function renderRows(leads) {
  if (!leads.length) {
    body.innerHTML = `<tr><td colspan="6" class="empty">No leads found.</td></tr>`;
    return;
  }
  body.innerHTML = leads.map((l) => `
    <tr>
      <td>${esc(l.name)}</td>
      <td class="email"><a href="mailto:${esc(l.email)}">${esc(l.email)}</a></td>
      <td>${esc(l.budget_range)}</td>
      <td class="msg">${esc(l.message) || '<span class="muted">—</span>'}</td>
      <td class="received">${fmtDate(l.created_at)}</td>
      <td>${statusCell(l)}</td>
    </tr>`).join('');
  body.querySelectorAll('.status-select').forEach((sel) => {
    sel.addEventListener('change', () => updateStatus(sel));
  });
}
async function updateStatus(sel) {
  const id = sel.getAttribute('data-id');
  const status = sel.value;
  const prev = sel.className;
  sel.disabled = true;
  try {
    const res = await fetch(`/api/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.status === 401) { showLogin(); return; }
    if (!res.ok) throw new Error('failed');
    sel.className = `status-select status-${status}`;
    load();
  } catch (_) {
    sel.className = prev;
    alert('Could not update status. Please try again.');
  } finally {
    sel.disabled = false;
  }
}

let debounceTimer;
async function load() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
  if (statusFilter.value) params.set('status', statusFilter.value);
  try {
    const res = await fetch(`/api/leads?${params.toString()}`);
    if (res.status === 401) { showLogin(); return; }
    const data = await res.json();
    renderStats(data.summary || {});
    renderRows(data.leads || []);
  } catch (_) {
    body.innerHTML = `<tr><td colspan="6" class="empty">Failed to load leads.</td></tr>`;
  }
}

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(load, 200);
});
statusFilter.addEventListener('change', load);

checkAuth();
