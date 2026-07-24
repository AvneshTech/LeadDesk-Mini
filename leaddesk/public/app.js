'use strict';

// ---- Client-side validation mirrors server rules in validation.js ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const form = document.getElementById('lead-form');
const statusEl = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');
const budgetSelect = document.getElementById('budget_range');

// Populate budget options from the server config (single source of truth).
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    for (const b of cfg.budget_ranges) {
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      budgetSelect.appendChild(opt);
    }
  } catch (_) {
    // Fallback list if config fetch fails
    ['Under $1k', '$1k–$5k', '$5k–$10k', '$10k–$50k', '$50k+'].forEach((b) => {
      const opt = document.createElement('option');
      opt.value = b; opt.textContent = b; budgetSelect.appendChild(opt);
    });
  }
}
loadConfig();

function setError(fieldName, msg) {
  const field = form.querySelector(`[name="${fieldName}"]`).closest('.field');
  const errEl = form.querySelector(`[data-error-for="${fieldName}"]`);
  if (msg) {
    field.classList.add('invalid');
    errEl.textContent = msg;
  } else {
    field.classList.remove('invalid');
    errEl.textContent = '';
  }
}

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Name is required.';
  else if (values.name.length > 120) errors.name = 'Name must be 120 characters or fewer.';

  if (!values.email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Enter a valid email address.';

  if (!values.budget_range) errors.budget_range = 'Select a budget range.';

  if (values.message.length > 2000) errors.message = 'Message must be 2000 characters or fewer.';
  return errors;
}

// Clear an error as soon as the user edits a field.
['name', 'email', 'budget_range', 'message'].forEach((f) => {
  form.querySelector(`[name="${f}"]`).addEventListener('input', () => setError(f, ''));
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';
  statusEl.className = 'form-status';

  const values = {
    name: form.name.value,
    email: form.email.value,
    budget_range: form.budget_range.value,
    message: form.message.value,
  };

  const errors = validate(values);
  ['name', 'email', 'budget_range', 'message'].forEach((f) => setError(f, errors[f]));
  if (Object.keys(errors).length) {
    const first = form.querySelector('.field.invalid input, .field.invalid select, .field.invalid textarea');
    if (first) first.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (res.status === 201) {
      form.innerHTML = `
        <div class="success-box">
          <div class="check">✓</div>
          <h2>Thank you!</h2>
          <p class="muted">Your inquiry has been received. We'll be in touch within one business day.</p>
        </div>`;
      return;
    }

    if (res.status === 422) {
      const body = await res.json();
      if (body.fields) {
        Object.entries(body.fields).forEach(([f, msg]) => setError(f, msg));
      }
      statusEl.textContent = 'Please fix the highlighted fields.';
      statusEl.classList.add('err');
    } else {
      statusEl.textContent = 'Something went wrong. Please try again.';
      statusEl.classList.add('err');
    }
  } catch (_) {
    statusEl.textContent = 'Network error. Please try again.';
    statusEl.classList.add('err');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send inquiry';
  }
});
