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

-- Download history — the source of truth for a user's list of downloads
-- (replacing the old browser-localStorage history). The MEDIA still lives on the
-- filesystem under backend/downloads/<download_id>/; this table owns the
-- lifecycle (status / expired / moved / kept) and the per-user attribution that
-- the storage quota is computed from.
--
-- `status` is 'downloading' | 'complete' | 'failed'. `expired` = media dropped
-- but the row kept (re-downloadable); `moved` = media handed to the user's own
-- cloud, with the provider link in `moved_info`.
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
  moved_info  jsonb,
  kept        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Added after the table shipped in 0XC-97; keeps re-running this file safe on a
-- database that already has the original definition.
ALTER TABLE downloads ADD COLUMN IF NOT EXISTS moved_info jsonb;

-- The listing query is always "this user's rows, newest first".
CREATE INDEX IF NOT EXISTS downloads_user_id_idx ON downloads (user_id);
CREATE INDEX IF NOT EXISTS downloads_user_created_idx ON downloads (user_id, created_at DESC);
