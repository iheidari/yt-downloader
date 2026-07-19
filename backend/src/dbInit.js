// One-shot schema applier: `npm run db:init`. Reads ../schema.sql and runs it
// against DATABASE_URL. The schema is idempotent (CREATE … IF NOT EXISTS), so
// this is safe to re-run. Not part of the server — invoke it manually once when
// provisioning a new Neon database.
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { getPool } = require('./db');

async function main() {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const pool = getPool();
  console.log('🗄️  Applying schema.sql to the database…');
  await pool.query(sql);
  console.log('✅ Schema applied.');
  await pool.end();
}

main().catch((err) => {
  console.error('❌ db:init failed:', err.message);
  process.exit(1);
});
