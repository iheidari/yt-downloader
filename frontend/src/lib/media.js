// Shared media helpers used across pages/components.

const AUDIO_RE = /\.(mp3|m4a|ogg|opus|wav|flac)$/i

export function isAudioFile(filename) {
  return AUDIO_RE.test(filename || '')
}

// Canonical audio/video classification for a download record. Prefers the
// explicit `type` yt-dlp gave us, falling back to the filename extension. Use
// this everywhere so a download can't be labelled differently per screen.
export function mediaKind(download) {
  if (download?.type === 'audio') return 'audio'
  if (download?.type === 'video' || download?.type === 'combined') return 'video'
  return isAudioFile(download?.filename) ? 'audio' : 'video'
}

// mm:ss formatter shared by the format list and the player dock.
export function formatDuration(seconds, fallback = '') {
  if (!Number.isFinite(seconds) || seconds < 0) return fallback
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Single place that talks to GET /api/files. Returns the raw download array
// (or [] on any failure), so callers don't each re-implement the fetch/guard.
export async function fetchDownloads(apiUrl) {
  const res = await fetch(`${apiUrl}/api/files`)
  const data = await res.json()
  if (!data.success || !Array.isArray(data.data)) return []
  return data.data
}

export function formatFileSize(bytes) {
  if (!bytes) return 'Unknown'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`
}

// Canonical file URL for a download. Pass { download: true } for a forced attachment.
export function fileUrl(apiUrl, downloadId, filename, { download = false } = {}) {
  const base = `${apiUrl}/api/files/${downloadId}/${encodeURIComponent(filename)}`
  return download ? `${base}?action=download` : base
}
