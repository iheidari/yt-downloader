// Data-access layer for auth. Everything that touches Postgres lives behind this
// small interface so the orchestration in authService.js stays pure and
// testable: production wires `createStore(db.query)`; tests wire
// `createMemoryStore()`, which implements the same four methods in memory.

// Build a store backed by a `query(text, params)` function (see db.js).
function createStore(query) {
  return {
    // Look up an allowed user by email (login identity). Returns the row or null.
    async findUserByEmail(email) {
      const { rows } = await query(
        'SELECT id, email, name, max_storage_bytes FROM users WHERE email = $1',
        [email],
      );
      return rows[0] || null;
    },

    // Load a user by id (for session hydration in the auth middleware).
    async findUserById(id) {
      const { rows } = await query(
        'SELECT id, email, name, max_storage_bytes FROM users WHERE id = $1',
        [id],
      );
      return rows[0] || null;
    },

    // Persist a new single-use token (its hash only).
    async insertLoginToken({ tokenHash, email, expiresAt }) {
      await query('INSERT INTO login_tokens (token_hash, email, expires_at) VALUES ($1, $2, $3)', [
        tokenHash,
        email,
        expiresAt,
      ]);
    },

    // Atomically consume a token: mark it used only if it is currently unused
    // and unexpired, returning its email. A second verify (or an expired one)
    // matches zero rows and returns null — this single UPDATE is what makes the
    // link single-use even under concurrent clicks.
    async consumeLoginToken(tokenHash) {
      const { rows } = await query(
        `UPDATE login_tokens
            SET used_at = now()
          WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING email`,
        [tokenHash],
      );
      return rows[0] ? rows[0].email : null;
    },
  };
}

// In-memory store with the identical interface, for unit tests (no Postgres).
function createMemoryStore({ users = [] } = {}) {
  const tokens = new Map(); // tokenHash -> { email, expiresAt: Date, usedAt: Date|null }

  return {
    async findUserByEmail(email) {
      return users.find((u) => u.email === email) || null;
    },
    async findUserById(id) {
      return users.find((u) => u.id === id) || null;
    },
    async insertLoginToken({ tokenHash, email, expiresAt }) {
      tokens.set(tokenHash, { email, expiresAt: new Date(expiresAt), usedAt: null });
    },
    async consumeLoginToken(tokenHash) {
      const t = tokens.get(tokenHash);
      if (!t || t.usedAt || t.expiresAt.getTime() <= Date.now()) return null;
      t.usedAt = new Date();
      return t.email;
    },
    // Test-only escape hatch.
    _tokens: tokens,
  };
}

module.exports = { createStore, createMemoryStore };
