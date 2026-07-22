const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { parseSchemaColumns } = require('./schemaColumns');

test('parses the real schema.sql and finds the columns dbInit depends on', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  const columns = parseSchemaColumns(sql);

  assert.ok(columns.downloads.includes('completed_at'));
  assert.ok(columns.users.includes('max_storage_bytes'));
  assert.deepEqual(
    new Set(columns.login_tokens),
    new Set(['token_hash', 'email', 'expires_at', 'used_at', 'created_at']),
  );
});

test('parses both `CREATE TABLE` and `CREATE TABLE IF NOT EXISTS`', () => {
  const sql = `
    CREATE TABLE plain (id uuid);
    CREATE TABLE IF NOT EXISTS guarded (id uuid);
  `;
  const columns = parseSchemaColumns(sql);
  assert.deepEqual(columns.plain, ['id']);
  assert.deepEqual(columns.guarded, ['id']);
});

test('does not split on commas or parens inside inline defaults/types', () => {
  const sql = `
    CREATE TABLE items (
      id uuid PRIMARY KEY,
      price numeric(10,2) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      label text DEFAULT 'a,b(c)'
    );
  `;
  const columns = parseSchemaColumns(sql);
  assert.deepEqual(new Set(columns.items), new Set(['id', 'price', 'created_at', 'label']));
});

test('does not treat table-level constraint lines as columns', () => {
  const sql = `
    CREATE TABLE saved (
      user_id uuid NOT NULL,
      camp_id uuid NOT NULL,
      PRIMARY KEY (user_id, camp_id),
      UNIQUE (user_id, camp_id),
      CONSTRAINT saved_camp_fk FOREIGN KEY (camp_id) REFERENCES campgrounds (id),
      CHECK (user_id <> camp_id)
    );
  `;
  const columns = parseSchemaColumns(sql);
  assert.deepEqual(new Set(columns.saved), new Set(['user_id', 'camp_id']));
});

test('picks up ALTER TABLE ADD COLUMN IF NOT EXISTS', () => {
  const sql = `
    CREATE TABLE downloads (download_id uuid PRIMARY KEY);
    ALTER TABLE downloads ADD COLUMN IF NOT EXISTS moved_info jsonb;
    ALTER TABLE downloads ADD COLUMN completed_at timestamptz;
  `;
  const columns = parseSchemaColumns(sql);
  assert.deepEqual(
    new Set(columns.downloads),
    new Set(['download_id', 'moved_info', 'completed_at']),
  );
});

test('handles quoted identifiers', () => {
  const sql = `CREATE TABLE "orders" ("id" uuid PRIMARY KEY, "user" text);`;
  const columns = parseSchemaColumns(sql);
  assert.deepEqual(new Set(columns.orders), new Set(['id', 'user']));
});

test('ignores line comments', () => {
  const sql = `
    -- a comment mentioning fake_column that must not be parsed
    CREATE TABLE notes ( -- trailing comment
      id uuid PRIMARY KEY, -- the id
      body text
    );
  `;
  const columns = parseSchemaColumns(sql);
  assert.deepEqual(new Set(columns.notes), new Set(['id', 'body']));
});

test('throws instead of silently passing when it finds zero columns', () => {
  assert.throws(() => parseSchemaColumns('-- nothing but a comment\n'), /zero columns/);
});
