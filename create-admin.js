'use strict';

/**
 * Create or update an admin login — no public signup by design.
 *
 * Usage:
 *   node create-admin.js <username> <password>
 *
 * Examples:
 *   node create-admin.js amit 'S0me-Strong-Pass!'      # against DATABASE_URL
 *   DB_DRIVER=mem node create-admin.js amit demo123     # against in-memory demo
 *
 * If the username already exists, its password is updated (rehashed).
 * Passwords are stored as a scrypt "salt:hash" — never in plaintext.
 */

const db = require('./db');
const { hashPassword } = require('./auth');

async function run() {
  const [username, password] = process.argv.slice(2);

  if (!username || !password) {
    console.error('Usage: node create-admin.js <username> <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Refusing to set a password shorter than 8 characters.');
    process.exit(1);
  }

  await db.init();
  const hash = hashPassword(password);

  const { rows } = await db.query('SELECT id FROM admin_users WHERE username = $1', [username]);
  if (rows.length) {
    await db.query('UPDATE admin_users SET password_hash = $1 WHERE username = $2', [hash, username]);
    console.log(`Updated password for admin "${username}".`);
  } else {
    await db.query('INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)', [username, hash]);
    console.log(`Created admin "${username}".`);
  }
  process.exit(0);
}

run().catch((err) => { console.error(err.message); process.exit(1); });
