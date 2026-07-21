const { test } = require('node:test');
const assert = require('node:assert/strict');

const { applySchema } = require('./dbInit');

// A fake pool that never touches a real database: it records every query,
// answers information_schema lookups from a canned column list, and no-ops
// everything else (standing in for the schema.sql DDL). Lets us exercise the
// post-apply column assertion without Postgres in CI (0XC-115).
function fakePool(columnsByTable) {
  const queries = [];
  return {
    queries,
    async query(text, params) {
      queries.push(text);
      if (text.includes('information_schema.columns')) {
        const table = params[0];
        const columns = columnsByTable[table] || [];
        return { rows: columns.map((column_name) => ({ column_name })) };
      }
      return { rows: [] };
    },
  };
}

test('applySchema resolves when every required column is present', async () => {
  const pool = fakePool({ downloads: ['download_id', 'user_id', 'completed_at', 'moved_info'] });
  await assert.doesNotReject(() => applySchema(pool));
  // The schema DDL ran before the column assertion.
  assert.ok(pool.queries.some((q) => q.includes('CREATE TABLE IF NOT EXISTS users')));
});

test('applySchema throws a clear error when a required column is missing', async () => {
  const pool = fakePool({ downloads: ['download_id'] });
  await assert.rejects(() => applySchema(pool), /downloads.*completed_at/s);
});

test('applySchema throws when the required table has no columns at all (e.g. missing table)', async () => {
  const pool = fakePool({});
  await assert.rejects(() => applySchema(pool), /downloads/);
});
