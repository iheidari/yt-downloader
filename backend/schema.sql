-- Tubekeep schema (Neon Postgres). Hand-written, no ORM / migration framework.
-- Apply once against your Neon database:
--
--   cd backend && DATABASE_URL='postgres://…?sslmode=require' npm run db:init
--
-- or paste this file into the Neon SQL editor. It is idempotent (IF NOT EXISTS)
-- so re-running it is safe.
--
-- Users are managed BY HAND in the Neon dashboard — there is no signup or admin
-- UI. Add a row to `users` to grant someone access; delete it to revoke.

-- gen_random_uuid() lives in pgcrypto on older Postgres; Neon has it built in,
-- but enable the extension defensively so a fresh database still resolves it.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text UNIQUE NOT NULL,
  name              text,
  -- Per-user storage cap in bytes. -1 = unlimited. Default 5 GB. Consumed by
  -- the history/quota work in 0XC-100.
  max_storage_bytes bigint NOT NULL DEFAULT 5368709120,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Single-use magic-link tokens. We store only the SHA-256 hash of the raw
-- token, never the token itself, so a database leak can't be replayed as a
-- login link.
CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash text PRIMARY KEY,
  email      text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sweep helper: find/prune expired tokens quickly.
CREATE INDEX IF NOT EXISTS login_tokens_expires_at_idx ON login_tokens (expires_at);

-- Download history. Defined here so 0XC-100 can populate it; the app is not yet
-- wired to write to this table.
CREATE TABLE IF NOT EXISTS downloads (
  download_id uuid PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  url         text,
  title       text,
  thumbnail   text,
  type        text,
  filename    text,
  filesize    bigint,
  status      text,
  expired     boolean NOT NULL DEFAULT false,
  expired_at  timestamptz,
  moved       boolean NOT NULL DEFAULT false,
  kept        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS downloads_user_id_idx ON downloads (user_id);
