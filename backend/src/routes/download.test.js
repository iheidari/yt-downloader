const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createDownloadRouter } = require('./download');
const { createMemoryStore } = require('../services/downloadsStore');
const { DownloadCapError } = require('../services/downloadManager');

const GB = 1024 ** 3;
// Requests that are expected to PASS the guards use MB-scale sizes: the global
// free-disk backstop runs for real here, and it wants 2× the size plus headroom.
const MB = 1024 ** 2;
const USER = '11111111-1111-1111-1111-111111111111';
const OTHER = '33333333-3333-3333-3333-333333333333';

let server;
let base;
let store;
let user;
let started; // jobs the stubbed download manager was asked to start
let startImpl;

// Mount the router behind a stub session and a stub job starter, so the guards
// are exercised without Postgres, without a real login, and without ever
// spawning yt-dlp.
before(async () => {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/download',
    (req, _res, next) => {
      req.user = user;
      next();
    },
    createDownloadRouter({
      store: {
        // Delegate to whichever memory store the current test set up.
        insert: (...a) => store.insert(...a),
        usageForUser: (...a) => store.usageForUser(...a),
        deleteForUser: (...a) => store.deleteForUser(...a),
        markComplete: (...a) => store.markComplete(...a),
        markFailed: (...a) => store.markFailed(...a),
      },
      start: (params, hooks) => startImpl(params, hooks),
    }),
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
  started = [];
  startImpl = (params, hooks) => {
    started.push({ params, hooks });
    return { downloadId: params.downloadId };
  };
  user = { user_id: USER, max_storage_bytes: 5 * GB };
});

function start(body) {
  return fetch(`${base}/api/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://example.com/watch?v=abc',
      formatId: '137',
      type: 'video',
      title: 'A video',
      ...body,
    }),
  });
}

// Seed `bytes` of completed storage for `userId`.
async function seedUsage(userId, bytes) {
  await store.insert({ downloadId: 'seed', userId, filesize: bytes });
  await store.markComplete('seed', { filename: 'seed.mp4', filesize: bytes });
}

test('a download that would exceed the user’s quota is refused with 507', async () => {
  await seedUsage(USER, 4.5 * GB); // 0.5 GB left of a 5 GB quota

  const res = await start({ filesize: GB });
  const body = await res.json();

  assert.equal(res.status, 507);
  assert.equal(body.success, false);
  assert.match(body.error, /storage/i);
  // No job started, and nothing recorded for the refused download.
  assert.equal(started.length, 0);
  assert.equal((await store.listByUser(USER)).length, 1);
});

test('the quota check reads the requesting user’s own usage, not everyone’s', async () => {
  await seedUsage(OTHER, 4.9 * GB); // someone else is nearly full

  const res = await start({ filesize: 10 * MB });

  assert.equal(res.status, 200);
  assert.equal(started.length, 1);
});

test('an unlimited (-1) quota is never blocked by usage', async () => {
  user = { user_id: USER, max_storage_bytes: -1 };
  await seedUsage(USER, 500 * GB); // far past any finite quota

  const res = await start({ filesize: 10 * MB });

  assert.equal(res.status, 200);
  assert.equal(started.length, 1);
});

test('a started download is recorded under the user as `downloading`', async () => {
  const res = await start({ filesize: 10 * MB });
  const { downloadId } = (await res.json()).data;

  const row = await store.findForUser(downloadId, USER);
  assert.equal(row.status, 'downloading');
  assert.equal(row.title, 'A video');
  // The in-flight row already occupies the quota.
  assert.equal(await store.usageForUser(USER), 10 * MB);
});

test('the job’s terminal hooks write the outcome back to the row', async () => {
  const res = await start({ filesize: 10 * MB });
  const { downloadId } = (await res.json()).data;

  await started[0].hooks.onComplete({ filename: 'real.mp4', size: 21 * MB });
  const row = await store.findForUser(downloadId, USER);
  assert.equal(row.status, 'complete');
  assert.equal(row.filename, 'real.mp4');
  // The real on-disk size replaces the client's estimate for quota accounting.
  assert.equal(row.size, 21 * MB);
});

test('a failed start (over the concurrency cap) rolls its row back', async () => {
  startImpl = () => {
    throw new DownloadCapError(3);
  };

  const res = await start({ filesize: 10 * MB });

  assert.equal(res.status, 429);
  assert.equal((await store.listByUser(USER)).length, 0);
  assert.equal(await store.usageForUser(USER), 0);
});
