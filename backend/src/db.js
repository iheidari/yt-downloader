// Postgres connection pool (Neon). A single long-lived pool is correct for the
// always-on Docker backend — pooled connections are reused across requests
// rather than opened per query. Reads DATABASE_URL (Neon hands out a
// `...sslmode=require` URL); we force TLS explicitly so a URL without the flag
// still connects encrypted, and we VERIFY the server certificate by default so
// the connection isn't MITM-able (token hashes + emails travel over it). Neon's
// certs chain to a public CA in Node's trust store. If you ever run against a
// database whose CA isn't trusted, set `DATABASE_SSL_NO_VERIFY=true` as an
// explicit, documented opt-out (still encrypted, just unverified).
//
// The pool is created lazily on first use so importing this module never throws
// when DATABASE_URL is unset (e.g. in unit tests that inject their own store).
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set — cannot connect to Postgres. See backend/.env / CLAUDE.md.',
      );
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: process.env.DATABASE_SSL_NO_VERIFY !== 'true' },
    });
    pool.on('error', (err) => {
      // A pooled client can drop (Neon idle timeout, network blip); log so it's
      // grep-able but don't crash the process — the next query re-acquires.
      console.error('❌ Postgres pool error:', err.message);
    });
  }
  return pool;
}

// Thin query helper so callers don't reach for the pool directly.
function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { getPool, query };
