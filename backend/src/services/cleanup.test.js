const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const { runCleanup } = require('./cleanup');
const { createMemoryStore } = require('./downloadsStore');
const { ensureDownloadDir } = require('../utils/storage');

const ONE_HOUR_MS = 60 * 60 * 1000;
const USER = '11111111-1111-1111-1111-111111111111';

// Directories this file creates, removed even if an assertion throws so a
// failed run never leaves debris in the real downloads root (same pattern as
// utils/cleanupOldDownloads.test.js, which this exercises the caller of).
const created = [];

function makeOldDir() {
  const id = crypto.randomUUID();
  const dir = ensureDownloadDir(id);
  created.push(dir);
  fs.writeFileSync(path.join(dir, 'video.mp4'), 'x');
  const when = new Date(Date.now() - 2 * ONE_HOUR_MS);
  fs.utimesSync(dir, when, when);
  return { id, dir };
}

// A completed row matching an on-disk directory, the way a real download
// leaves both behind.
async function seedCompletedRow(store, id, { kept = false } = {}) {
  await store.insert({ downloadId: id, userId: USER, url: `https://x/${id}`, filesize: 1 });
  await store.markComplete(id, { filename: 'video.mp4', filesize: 1 });
  if (kept) await store.setKeptForUser(id, USER, true);
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a `kept` download is never expired on disk, however old — the skip-set carries the store’s kept flag', async () => {
  const { id, dir } = makeOldDir();
  const store = createMemoryStore();
  await seedCompletedRow(store, id, { kept: true });

  const result = await runCleanup(store);

  assert.equal(result.expiredIds.includes(id), false);
  assert.equal(fs.existsSync(dir), true);
  // The row itself is untouched — nothing reconciled it away either.
  assert.equal((await store.findForUser(id, USER)).expired, false);
});

test('an old, non-kept download is expired on disk', async () => {
  const { id, dir } = makeOldDir();
  const store = createMemoryStore();
  await seedCompletedRow(store, id, { kept: false });

  const result = await runCleanup(store);

  assert.ok(result.expiredIds.includes(id));
  assert.equal(fs.existsSync(dir), false);
});

test('a `kept` row belonging to a different user still protects the directory — keptIds spans all users', async () => {
  const { id, dir } = makeOldDir();
  const store = createMemoryStore();
  await store.insert({ downloadId: id, userId: 'other-user', url: 'https://x', filesize: 1 });
  await store.markComplete(id, { filename: 'video.mp4', filesize: 1 });
  await store.setKeptForUser(id, 'other-user', true);

  const result = await runCleanup(store);

  assert.equal(result.expiredIds.includes(id), false);
  assert.equal(fs.existsSync(dir), true);
});

test('a store.keptIds() failure degrades to an un-protected sweep rather than throwing', async () => {
  const { id, dir } = makeOldDir();
  const brokenStore = {
    async keptIds() {
      throw new Error('db unavailable');
    },
  };

  const result = await runCleanup(brokenStore);

  // Nothing crashed, and with no usable kept list the directory ages out like
  // any other — fails safe toward cleanup, not toward silently keeping
  // everything forever.
  assert.ok(result.expiredIds.includes(id));
  assert.equal(fs.existsSync(dir), false);
});

test('the store-less path (standalone `npm run cleanup`) still runs and expires by directory age alone', async () => {
  const { id, dir } = makeOldDir();

  const result = await runCleanup(); // no store argument — must not throw

  assert.ok(result.expiredIds.includes(id));
  assert.equal(fs.existsSync(dir), false);
});

// --- the standalone `npm run cleanup` CLI (a real, separate process) -------
// A one-shot `node src/services/cleanup.js` invocation has neither a store
// (no `keptIds()`) nor a job registry (no `runningDownloadIds()` — that only
// knows about jobs in *its own* process). With neither guard, it must use a
// wider age threshold than the server sweep's 1h, or a live download running
// in some OTHER process (the actual server) could have its directory deleted
// out from under it for looking merely mtime-quiet within the first hour.

test('the standalone CLI does not touch a 2h-old directory — inside the server sweep window but not its own', () => {
  const { dir } = makeOldDir(); // 2h old, per makeOldDir's fixed age

  execFileSync('node', ['src/services/cleanup.js'], { cwd: path.join(__dirname, '../..') });

  assert.equal(fs.existsSync(dir), true);
});

test('the standalone CLI still reclaims a directory old enough to be unambiguous debris (7h)', () => {
  const id = crypto.randomUUID();
  const dir = ensureDownloadDir(id);
  created.push(dir);
  fs.writeFileSync(path.join(dir, 'video.mp4'), 'x');
  const when = new Date(Date.now() - 7 * ONE_HOUR_MS);
  fs.utimesSync(dir, when, when);

  execFileSync('node', ['src/services/cleanup.js'], { cwd: path.join(__dirname, '../..') });

  assert.equal(fs.existsSync(dir), false);
});

test('a fresh download — kept or not — is left alone', async () => {
  const id = crypto.randomUUID();
  const dir = ensureDownloadDir(id);
  created.push(dir);
  fs.writeFileSync(path.join(dir, 'video.mp4'), 'x');
  const store = createMemoryStore();
  await seedCompletedRow(store, id, { kept: false });

  const result = await runCleanup(store);

  assert.equal(result.expiredIds.includes(id), false);
  assert.equal(fs.existsSync(dir), true);
});
