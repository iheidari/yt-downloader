const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod';

const { createRequireAuth } = require('./requireAuth');
const { signSession, SESSION_COOKIE } = require('../services/authService');
const { createMemoryStore } = require('../services/authStore');

const USER = { id: 'user-1', email: 'alice@example.com', name: 'Alice', max_storage_bytes: 4242 };

// Drive the middleware through a real Express app + a protected route that
// echoes back whatever requireAuth attached, so we assert on observable HTTP
// behaviour rather than the middleware internals. The store is the in-memory
// one — the middleware's own data access runs for real.
let server;
let base;

before(async () => {
  const app = express();
  app.use(cookieParser());
  const store = createMemoryStore({ users: [USER] });
  app.get('/protected', createRequireAuth(store), (req, res) => {
    res.json({ success: true, data: req.user });
  });
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(() => {
  server.close();
});

// Build a `Cookie` header carrying a signed session for the given payload.
function cookieFor(token) {
  return { Cookie: `${SESSION_COOKIE}=${token}` };
}

test('a valid session cookie attaches req.user and passes through (200)', async () => {
  const res = await fetch(`${base}/protected`, { headers: cookieFor(signSession(USER)) });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.deepEqual(body.data, {
    user_id: 'user-1',
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    max_storage_bytes: 4242,
  });
});

test('a tampered session JWT is rejected with 401', async () => {
  const res = await fetch(`${base}/protected`, {
    headers: cookieFor(`${signSession(USER)}tampered`),
  });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).success, false);
});

test('an expired session JWT is rejected with 401', async () => {
  const expired = jwt.sign({ sub: USER.id, email: USER.email }, process.env.JWT_SECRET, {
    expiresIn: -10,
  });
  const res = await fetch(`${base}/protected`, { headers: cookieFor(expired) });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).success, false);
});

test('a valid session whose user no longer exists is rejected with 401', async () => {
  const ghost = jwt.sign({ sub: 'ghost-user', email: 'ghost@example.com' }, process.env.JWT_SECRET);
  const res = await fetch(`${base}/protected`, { headers: cookieFor(ghost) });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).success, false);
});

test('a missing session cookie is rejected with 401', async () => {
  const res = await fetch(`${base}/protected`);
  assert.equal(res.status, 401);
  assert.equal((await res.json()).success, false);
});
