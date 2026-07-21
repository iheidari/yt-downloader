// Regression guard for 0XC-115 ("Apply schema.sql automatically on boot").
// server.js's boot sequence is now `ensureSchema().then(startCleanupScheduler
// ...).then(app.listen ...)`. ensureSchema() must be a true no-op — it must
// never call getPool()/applySchema() — when DATABASE_URL is unset, so the
// server still boots and serves traffic with no database configured at all
// (this sandbox, unit tests elsewhere in this suite, an offline dev install).
//
// This is the one true end-to-end path testable without a real Postgres: spawn
// the real server as a child process (the same pattern as cors-env.test.js /
// api-cache.test.js) with DATABASE_URL explicitly absent, and confirm it
// reaches app.listen() (i.e. /health answers) with no schema-related error.

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 3992;
const base = `http://localhost:${PORT}`;
let server;
let stderr = '';

before(async () => {
  const env = { ...process.env, PORT: String(PORT), NODE_ENV: 'test' };
  delete env.DATABASE_URL; // must exercise the skip path, not inherit a real one

  server = spawn('node', [path.join(__dirname, '..', 'src', 'server.js')], {
    env,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  server.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`${base}/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Test server did not start in time');
});

after(() => {
  if (server) server.kill('SIGKILL');
});

test('server boots and serves /health with no DATABASE_URL configured (ensureSchema skip path)', async () => {
  const res = await fetch(`${base}/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, 'ok');

  // ensureSchema()'s only observable output is on the paths it must NOT take
  // here: a successful apply logs "Database schema up to date", and a failed
  // one logs "Failed to apply database schema". Neither should appear — the
  // function should have returned immediately on the missing DATABASE_URL
  // check, before ever touching getPool()/applySchema().
  assert.ok(
    !stderr.includes('Failed to apply database schema'),
    'ensureSchema must not attempt (and fail) a schema apply when DATABASE_URL is unset',
  );
});
