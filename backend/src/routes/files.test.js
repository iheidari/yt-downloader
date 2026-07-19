const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');

// requireAuth short-circuits to 401 on a missing/invalid cookie before it ever
// touches the store, so this exercise of the files router's auth wiring stays
// hermetic (no Postgres). JWT_SECRET is set for completeness.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod';

const filesRoutes = require('./files');

let server;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/files', filesRoutes);
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

test('GET /api/files (download list) is private — 401 without a session', async () => {
  const res = await fetch(`${base}/api/files`);
  assert.equal(res.status, 401);
  assert.equal((await res.json()).success, false);
});

test('PATCH /api/files/:id is private — 401 without a session', async () => {
  const res = await fetch(`${base}/api/files/some-id?kept=true`, { method: 'PATCH' });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).success, false);
});

test('DELETE /api/files/:id is private — 401 without a session', async () => {
  const res = await fetch(`${base}/api/files/some-id`, { method: 'DELETE' });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).success, false);
});

test('GET /api/files/:id/:filename byte-range serve stays public (not 401) for shared links', async () => {
  // No session cookie: the serve route must not be auth-gated. A non-existent
  // download yields 404 (proving the handler ran), never a 401.
  const res = await fetch(`${base}/api/files/missing-id/missing.mp4`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).success, false);
});
