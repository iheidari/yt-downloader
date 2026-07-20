const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { cleanupOrphanDirs, downloadsDir, ensureDownloadDir } = require('./storage');

// Directories this test created, removed even if an assertion throws so a failed
// run never leaves debris in the real downloads root.
const created = [];

function makeDir({ withMetadata, ageMs = 0 }) {
  const id = crypto.randomUUID();
  const dir = ensureDownloadDir(id);
  created.push(dir);
  fs.writeFileSync(path.join(dir, 'video.mp4'), 'x');
  if (withMetadata) {
    fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ downloadId: id }));
  }
  if (ageMs) {
    const when = new Date(Date.now() - ageMs);
    fs.utimesSync(dir, when, when);
  }
  return { id, dir };
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('removes an old directory that never got a metadata.json', () => {
  // Debris: a download that died mid-flight, or a yt-dlp process that flushed
  // after its cancel recreated the directory. Nothing lists these, so the
  // age-based sweep can never reach them.
  const orphan = makeDir({ withMetadata: false, ageMs: 10 * 60 * 60 * 1000 });

  const result = cleanupOrphanDirs(6 * 60 * 60 * 1000);

  assert.ok(result.removedIds.includes(orphan.id));
  assert.equal(fs.existsSync(orphan.dir), false);
});

test('leaves a recent metadata-less directory alone — it may still be downloading', () => {
  const inFlight = makeDir({ withMetadata: false });

  cleanupOrphanDirs(6 * 60 * 60 * 1000);

  assert.equal(fs.existsSync(inFlight.dir), true);
});

test('never touches a real download, however old', () => {
  const real = makeDir({ withMetadata: true, ageMs: 10 * 60 * 60 * 1000 });

  const result = cleanupOrphanDirs(6 * 60 * 60 * 1000);

  assert.equal(result.removedIds.includes(real.id), false);
  assert.equal(fs.existsSync(real.dir), true);
});

test('ignores directories that are not download ids', () => {
  const stray = path.join(downloadsDir, 'not-a-download-id');
  fs.mkdirSync(stray, { recursive: true });
  created.push(stray);
  const when = new Date(Date.now() - 10 * 60 * 60 * 1000);
  fs.utimesSync(stray, when, when);

  cleanupOrphanDirs(6 * 60 * 60 * 1000);

  assert.equal(fs.existsSync(stray), true);
});
