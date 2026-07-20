const { cleanupOldDownloads, listDownloads } = require('../utils/storage');
const { sweepJobs } = require('./downloadManager');
const { getActiveStore } = require('./downloadsStore');

const CLEANUP_INTERVAL_HOURS = 1;
// Downloads are a transfer, not storage: a visitor either moves a file to their
// own cloud or downloads it to their device shortly after. Expire after 1h.
const MAX_FILE_AGE_HOURS = 1;

// A `downloading` history row older than this can't still be running — the job
// registry is in-memory, so a restart strands its row. Generously past the
// longest plausible download so a slow-but-live one is never retired early.
const STALE_DOWNLOADING_MS = 6 * 60 * 60 * 1000;

let cleanupInterval = null;

function startCleanupScheduler() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  const intervalMs = CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;

  console.log(
    `🧹 Cleanup scheduler started (runs every ${CLEANUP_INTERVAL_HOURS}h, max age: ${MAX_FILE_AGE_HOURS}h)`,
  );

  // runCleanup is async (it syncs the history table); the scheduler is
  // fire-and-forget, so catch here or a failed sweep becomes an unhandled
  // rejection that takes the process down.
  const sweep = () => runCleanup().catch((err) => console.error('❌ Cleanup failed:', err.message));

  sweep();
  cleanupInterval = setInterval(sweep, intervalMs);

  process.on('SIGINT', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
    process.exit(0);
  });
}

async function runCleanup() {
  console.log('🧹 Running cleanup...');
  const result = cleanupOldDownloads(MAX_FILE_AGE_HOURS);

  if (result.expired > 0) {
    console.log(`✅ Expired ${result.expired} old downloads: ${result.expiredIds.join(', ')}`);
  } else {
    console.log('✅ No old downloads to expire');
  }

  // Mirror the filesystem sweep into the per-user history table, which is what
  // the UI lists and the quota is computed from — otherwise an aged-out download
  // would keep occupying its owner's allowance. `getActiveStore()` is null in
  // unit tests / the standalone CLI without a database, where this is a no-op.
  const store = getActiveStore();
  if (store) {
    try {
      // Reconcile against what is actually still on disk, so rows also expire
      // when the files went away by some other route (standalone `npm run
      // cleanup`, a manual rm) — not just when this run expired them.
      const present = listDownloads()
        .filter((d) => !d.expired)
        .map((d) => d.downloadId);
      const reconciled = await store.expireMissing(present);
      if (reconciled > 0) {
        console.log(`🧹 Marked ${reconciled} history row(s) expired`);
      }
      const stale = await store.failStale(STALE_DOWNLOADING_MS);
      if (stale > 0) {
        console.log(`🧹 Marked ${stale} stranded in-progress download(s) as failed`);
      }
    } catch (err) {
      console.error('⚠️ Cleanup could not update download history:', err.message);
    }
  }

  if (result.errors.length > 0) {
    console.error('⚠️ Cleanup errors:', result.errors);
  }

  // Prune terminal (complete/error) download-job records the manager retains for
  // reconnects, so a long-lived process doesn't accumulate them.
  const prunedJobs = sweepJobs();
  if (prunedJobs > 0) {
    console.log(`🧹 Pruned ${prunedJobs} finished download job(s)`);
  }

  return result;
}

function stopCleanupScheduler() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// Standalone `npm run cleanup`: filesystem only. No store is registered in this
// process, so history rows are left to the running server's hourly sweep to
// reconcile (it re-derives expiry from the media that is now gone).
if (require.main === module) {
  const result = cleanupOldDownloads(MAX_FILE_AGE_HOURS);
  console.log('Manual cleanup result:', result);
  process.exit(0);
}

module.exports = {
  startCleanupScheduler,
  stopCleanupScheduler,
  runCleanup,
};
