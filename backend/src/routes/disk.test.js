const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const express = require('express');

const { createDiskRouter } = require('./disk');
const { createMemoryStore } = require('../services/downloadsStore');
const { DISK_SIZE_MULTIPLIER, DISK_HEADROOM_BYTES, downloadsDir } = require('../utils/storage');

const GB = 1024 ** 3;
const USER = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

let server;
let base;
let store;
let user;

// Mount the router behind a stub session so the per-user quota block is
// exercised without Postgres. getDiskUsage() runs for real against the actual
// filesystem — the machine-dependent numbers are asserted by shape only.
// server.js creates downloadsDir on boot, but this test mounts the router
// directly, so a fresh checkout with no prior download (and thus no
// downloads/ directory yet) would otherwise 404/500 statfs — ensure it here
// rather than relying on another test file's side effect to have created it.
before(async () => {
  fs.mkdirSync(downloadsDir, { recursive: true });

  const app = express();
  app.use(
    '/api/disk',
    (req, _res, next) => {
      req.user = user;
      next();
    },
    createDiskRouter({ store: { usageForUser: (...a) => store.usageForUser(...a) } }),
  );
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(() => server.close());

beforeEach(() => {
  store = createMemoryStore();
  user = { user_id: USER, max_storage_bytes: 5 * GB };
});

// Seed `bytes` of completed storage for `userId`.
async function seedUsage(userId, id, bytes) {
  await store.insert({ downloadId: id, userId, filesize: bytes, type: 'video' });
  await store.markComplete(id, { filename: `${id}.mp4`, filesize: bytes });
}

const get = async () => (await (await fetch(`${base}/api/disk`)).json()).data;

test('the quota block reports the caller’s own usage and what is left of their cap', async () => {
  await seedUsage(USER, 'a', 2 * GB);

  const data = await get();

  assert.deepEqual(data.quota, { used: 2 * GB, max: 5 * GB, remaining: 3 * GB });
});

test('another user’s downloads never count against the caller’s quota', async () => {
  await seedUsage(OTHER, 'theirs', 4 * GB);

  const data = await get();

  assert.deepEqual(data.quota, { used: 0, max: 5 * GB, remaining: 5 * GB });
});

test('an unlimited (-1) quota reports -1 remaining however much is used', async () => {
  user = { user_id: USER, max_storage_bytes: -1 };
  await seedUsage(USER, 'a', 500 * GB);

  const data = await get();

  assert.equal(data.quota.used, 500 * GB);
  assert.equal(data.quota.remaining, -1);
});

test('an over-quota user reads as 0 remaining, never negative', async () => {
  await seedUsage(USER, 'a', 9 * GB);

  const data = await get();

  assert.equal(data.quota.remaining, 0);
});

test('the fit knobs are echoed so the client disable-check cannot drift from the server guard', async () => {
  const data = await get();

  assert.equal(data.sizeMultiplier, DISK_SIZE_MULTIPLIER);
  assert.equal(data.headroomBytes, DISK_HEADROOM_BYTES);
  assert.equal(typeof data.free, 'number');
  assert.equal(data.used, data.total - data.free);
});
