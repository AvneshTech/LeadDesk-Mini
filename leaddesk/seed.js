'use strict';

/**
 * Seed the database with sample leads (useful for demoing /admin).
 * Usage: npm run seed
 */

const db = require('./db');

const SAMPLE = [
  ['Ava Thompson', 'ava@brightlabs.io', '$10k–$50k', 'Need a marketing site + CMS by Q3.', 'New'],
  ['Marcus Lee', 'marcus.lee@nimbus.dev', '$5k–$10k', 'Looking to rebuild our checkout flow.', 'Contacted'],
  ['Priya Nair', 'priya@saffronco.com', '$1k–$5k', 'Small landing page for a product launch.', 'New'],
  ['Diego Ramirez', 'diego@ramirez.studio', '$50k+', 'Full platform rebuild, mobile + web.', 'Closed'],
  ['Sara Okafor', 'sara.okafor@gmail.com', 'Under $1k', 'Just a quick logo animation.', 'Contacted'],
];

async function run() {
  await db.init();
  for (const [name, email, budget, message, status] of SAMPLE) {
    await db.query(
      `INSERT INTO leads (name, email, budget_range, message, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, email, budget, message, status]
    );
  }
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM leads');
  console.log(`Seeded. Total leads: ${rows[0].n}`);
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
