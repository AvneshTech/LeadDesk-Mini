'use strict';

/**
 * Server-side validation for lead submissions.
 * Mirrors the client-side rules in /public so the API is safe even if
 * the form is bypassed (curl, Postman, disabled JS, etc.).
 */

const BUDGET_RANGES = [
  'Under $1k',
  '$1k–$5k',
  '$5k–$10k',
  '$10k–$50k',
  '$50k+',
];

const STATUSES = ['New', 'Contacted', 'Closed'];

// Pragmatic email check (RFC-perfect regexes are counter-productive).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLead(body) {
  const errors = {};
  const data = {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) errors.name = 'Name is required.';
  else if (name.length > 120) errors.name = 'Name must be 120 characters or fewer.';
  data.name = name;

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  else if (email.length > 254) errors.email = 'Email is too long.';
  data.email = email.toLowerCase();

  const budget = typeof body.budget_range === 'string' ? body.budget_range.trim() : '';
  if (!budget) errors.budget_range = 'Select a budget range.';
  else if (!BUDGET_RANGES.includes(budget)) errors.budget_range = 'Invalid budget range.';
  data.budget_range = budget;

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length > 2000) errors.message = 'Message must be 2000 characters or fewer.';
  data.message = message;

  return { valid: Object.keys(errors).length === 0, errors, data };
}

module.exports = { validateLead, BUDGET_RANGES, STATUSES };
