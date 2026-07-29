'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db');
const auth = require('../auth');
const { app } = require('../server');

test('repeated failed logins are rate-limited', async () => {
  await db.init();
  await auth.ensureAdminUser();

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    for (let i = 0; i < 5; i += 1) {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'wrong-password' }),
      });
      assert.equal(res.status, 401, `expected 401 on attempt ${i + 1}`);
    }

    const blocked = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'still-wrong' }),
    });

    assert.equal(blocked.status, 429);
    const body = await blocked.json();
    assert.match(body.error, /too many login attempts/i);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});
