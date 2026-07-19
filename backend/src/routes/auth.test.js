const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod';
process.env.APP_URL = 'http://app.test';

const { createAuthRouter } = require('./auth');
const { createMemoryStore } = require('../services/authStore');

const USER = { id: 'user-1', email: 'alice@example.com', name: 'Alice', max_storage_bytes: 4242 };

function fakeMailer() {
  const sent = [];
  return {
    sent,
    async sendMagicLink(email, rawToken) {
      sent.push({ email, rawToken });
    },
  };
}

let server;
let base;
let mailer;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  mailer = fakeMailer();
  const store = createMemoryStore({ users: [USER] });
  app.use('/api/auth', createAuthRouter({ store, mailer }));

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

// Pull the `tk_session=…` pair (drop attributes) from a Set-Cookie header.
function sessionCookie(setCookie) {
  return setCookie.split(';')[0];
}

test('GET /api/auth/me without a cookie returns 401', async () => {
  const res = await fetch(`${base}/api/auth/me`);
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.success, false);
});

test('full magic-link flow: request → verify sets cookie → me returns the user', async () => {
  const reqRes = await fetch(`${base}/api/auth/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@example.com' }),
  });
  assert.equal(reqRes.status, 200);
  assert.equal((await reqRes.json()).success, true);
  assert.equal(mailer.sent.length, 1);

  const token = mailer.sent[0].rawToken;
  const verifyRes = await fetch(`${base}/api/auth/verify?token=${encodeURIComponent(token)}`, {
    redirect: 'manual',
  });
  assert.equal(verifyRes.status, 302);
  assert.match(verifyRes.headers.get('location'), /login=success/);
  const setCookie = verifyRes.headers.get('set-cookie');
  assert.ok(setCookie?.includes('tk_session='), 'a session cookie should be set');

  const meRes = await fetch(`${base}/api/auth/me`, {
    headers: { Cookie: sessionCookie(setCookie) },
  });
  assert.equal(meRes.status, 200);
  const me = await meRes.json();
  assert.deepEqual(me, {
    success: true,
    data: { email: 'alice@example.com', name: 'Alice', max_storage_bytes: 4242 },
  });
});

test('POST /api/auth/request for an unknown email still returns a generic 200', async () => {
  const before = mailer.sent.length;
  const res = await fetch(`${base}/api/auth/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@example.com' }),
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).success, true);
  assert.equal(mailer.sent.length, before, 'no email should be sent for an unknown address');
});

test('POST /api/auth/request with a missing email returns 400 and sends nothing', async () => {
  const before = mailer.sent.length;
  const res = await fetch(`${base}/api/auth/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).success, false);
  assert.equal(mailer.sent.length, before);
});

test('POST /api/auth/request with an empty email returns 400', async () => {
  const res = await fetch(`${base}/api/auth/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '' }),
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).success, false);
});

test('POST /api/auth/request with a non-string email returns 400', async () => {
  const res = await fetch(`${base}/api/auth/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 12345 }),
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).success, false);
});

test('GET /api/auth/verify with a bad token redirects to the error state, no cookie', async () => {
  const res = await fetch(`${base}/api/auth/verify?token=garbage`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.match(res.headers.get('location'), /login=error/);
  assert.equal(res.headers.get('set-cookie'), null);
});

test('a magic link is single-use at the HTTP layer', async () => {
  await fetch(`${base}/api/auth/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@example.com' }),
  });
  const token = mailer.sent[mailer.sent.length - 1].rawToken;

  const first = await fetch(`${base}/api/auth/verify?token=${encodeURIComponent(token)}`, {
    redirect: 'manual',
  });
  assert.match(first.headers.get('location'), /login=success/);
  const second = await fetch(`${base}/api/auth/verify?token=${encodeURIComponent(token)}`, {
    redirect: 'manual',
  });
  assert.match(second.headers.get('location'), /login=error/);
});

test('POST /api/auth/logout clears the session cookie', async () => {
  const res = await fetch(`${base}/api/auth/logout`, { method: 'POST' });
  assert.equal(res.status, 200);
  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie.includes('tk_session='), 'clear-cookie sets tk_session');
  assert.match(setCookie, /Expires=|Max-Age=0/i);
});
