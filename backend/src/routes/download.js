const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { isSupportedUrl } = require('../services/ytdlp');
const { initSSE } = require('../utils/sse');
const { startJob, getJob, cancelJob, DownloadCapError } = require('../services/downloadManager');

// Start a download job and return its id. POST both mints the id AND starts the
// job server-side (via the download manager), so the download runs to completion
// independent of any client connection. The download parameters ride the request
// body; the concurrency cap is enforced here, before any SSE is opened.
router.post('/', (req, res) => {
  const { url, formatId, type, title, thumbnail, keep } = req.body;

  if (!url || !formatId) {
    return res.status(400).json({
      success: false,
      error: 'URL and formatId are required',
    });
  }

  if (!isSupportedUrl(url)) {
    return res.status(400).json({
      success: false,
      error: 'A valid http(s) URL is required',
    });
  }

  const downloadId = uuidv4();
  const resolvedType = type || 'video';

  try {
    startJob({
      downloadId,
      url,
      formatId,
      type: resolvedType,
      title,
      thumbnail,
      keep: keep === true || keep === 'true',
    });
  } catch (error) {
    if (error instanceof DownloadCapError) {
      // Over the concurrency cap — a plain HTTP error the UI surfaces inline.
      return res.status(429).json({ success: false, error: error.message });
    }
    console.error('❌ Failed to start download:', error);
    return res.status(500).json({ success: false, error: 'Failed to start download' });
  }

  res.json({
    success: true,
    data: {
      downloadId,
      url,
      formatId,
      type: resolvedType,
      status: 'started',
    },
  });
});

// Pure observer: attach to an already-running job and stream its progress. This
// endpoint NEVER spawns a process. Disconnecting only unsubscribes — the job
// keeps running server-side. An unknown id yields a terminal "download not
// found" error (e.g. after a server restart) instead of starting a download.
router.get('/progress/:downloadId', (req, res) => {
  const { downloadId } = req.params;
  const sendEvent = initSSE(res);
  const job = getJob(downloadId);

  if (!job) {
    sendEvent({ type: 'error', downloadId, error: 'Download not found' });
    return res.end();
  }

  sendEvent({ type: 'started', downloadId, progress: job.progress });

  // Job already finished before this client connected: replay the terminal
  // event immediately and close.
  if (job.status === 'complete') {
    sendEvent({ type: 'complete', downloadId, progress: 100, data: job.result });
    return res.end();
  }
  if (job.status === 'error') {
    sendEvent({ type: 'error', downloadId, error: job.error });
    return res.end();
  }

  // Running: replay the latest known progress, then stream live updates.
  sendEvent({ type: 'progress', downloadId, progress: job.progress });

  const onProgress = (progress) => sendEvent({ type: 'progress', downloadId, progress });
  const onComplete = (data) => {
    sendEvent({ type: 'complete', downloadId, progress: 100, data });
    cleanup();
    res.end();
  };
  const onError = (message) => {
    sendEvent({ type: 'error', downloadId, error: message });
    cleanup();
    res.end();
  };

  // Heartbeat to keep proxies from timing out the idle stream (every 15s).
  const heartbeatInterval = setInterval(() => {
    sendEvent({ type: 'ping', downloadId, progress: job.progress });
  }, 15000);

  function cleanup() {
    clearInterval(heartbeatInterval);
    job.emitter.off('progress', onProgress);
    job.emitter.off('complete', onComplete);
    job.emitter.off('error', onError);
  }

  job.emitter.on('progress', onProgress);
  job.emitter.on('complete', onComplete);
  job.emitter.on('error', onError);

  // Client navigated away / closed the tab: unsubscribe only. The job is NOT
  // aborted — it runs to completion server-side.
  req.on('close', cleanup);
});

// Explicit cancel: abort a running job and clean up its partial files (the
// yt-dlp layer removes partials on abort). Wired to the "Dismiss" on a
// downloading row and the "Cancel" on the download page.
router.delete('/:downloadId', (req, res) => {
  const { downloadId } = req.params;
  const ok = cancelJob(downloadId);

  if (ok) {
    return res.json({ success: true, message: 'Download cancelled' });
  }
  return res.status(404).json({ success: false, error: 'Download not found' });
});

module.exports = router;
