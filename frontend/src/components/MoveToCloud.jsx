import { useEffect, useRef, useState } from 'react'
import { useCloudMove } from '../hooks/useCloudMove'
import { FILE_EXPIRY_MS } from '../lib/media'

// A move must have at least this much runway before the file's expiry, so it
// can't be started only to have the hourly cleanup yank the source mid-upload.
const MOVE_CUTOFF_MS = 15 * 60 * 1000

// ms of runway left before this file is too close to expiry to safely move.
function moveRunwayMs(download) {
  if (!download?.createdAt) return Number.POSITIVE_INFINITY
  const createdAt = new Date(download.createdAt).getTime()
  if (Number.isNaN(createdAt)) return Number.POSITIVE_INFINITY
  return createdAt + FILE_EXPIRY_MS - Date.now()
}

// "Move to cloud" control for a completed download. Renders nothing when the
// server hasn't configured any cloud provider. A single button opens a provider
// menu (Dropbox / Google Drive / …); with just one enabled provider it moves
// straight there. Handles the whole flow inline: connect → upload progress →
// moved / error (with a "download instead" fallback).
function MoveToCloud({ download, downloadHref, onMoved }) {
  const { providers, phase, progress, error, activeProvider, move } = useCloudMove(download, {
    onMoved,
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [, setTick] = useState(0)
  const rootRef = useRef(null)

  // Flip the button to "expiring soon" exactly when the runway crosses the
  // cutoff, without polling — schedule a single re-render at that moment.
  const runway = moveRunwayMs(download)
  useEffect(() => {
    const untilCutoff = runway - MOVE_CUTOFF_MS
    if (!Number.isFinite(untilCutoff) || untilCutoff <= 0) return
    const timer = setTimeout(() => setTick((v) => v + 1), untilCutoff + 500)
    return () => clearTimeout(timer)
  }, [runway])

  // Close the provider menu on any outside click.
  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  // Hidden until we know which providers are enabled (avoids a flash then
  // disappear), and when none are configured.
  if (providers === null || providers.length === 0) return null

  // Too close to expiry to safely start a move — disable and nudge to download.
  if (phase === 'idle' && runway < MOVE_CUTOFF_MS) {
    return (
      <div className="flex flex-col items-stretch gap-1 min-w-[9rem]">
        <button
          type="button"
          disabled
          title="This file is about to expire — download it to your device instead."
          className="flex items-center justify-center gap-1 text-on-surface-variant/60 font-label-sm text-label-sm whitespace-nowrap border border-outline-variant px-3 py-1 rounded-full cursor-default"
        >
          <span className="material-symbols-outlined text-[16px]">cloud_off</span>
          Move to cloud
        </button>
        <span className="font-label-sm text-label-sm text-on-surface-variant/70 text-center">
          Expiring soon
        </span>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <span className="flex items-center gap-1 text-tertiary font-label-sm text-label-sm whitespace-nowrap">
        <span
          className="material-symbols-outlined text-[16px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          cloud_done
        </span>
        Moved
      </span>
    )
  }

  if (phase === 'error') {
    const isQuota = error?.code === 'quota'
    return (
      <div className="flex flex-col items-end gap-1 text-right">
        <p className="font-label-sm text-label-sm text-error max-w-[16rem]">
          {error?.message || 'Move failed'}
        </p>
        <div className="flex items-center gap-2">
          {downloadHref && (
            <a
              href={downloadHref}
              className="font-label-sm text-label-sm text-primary hover:underline whitespace-nowrap"
            >
              {isQuota ? 'Download instead' : 'Download to device'}
            </a>
          )}
          <button
            type="button"
            onClick={() => move(activeProvider)}
            className="font-label-sm text-label-sm text-primary hover:underline whitespace-nowrap"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const busy = phase !== 'idle'
  const PHASE_LABELS = { connecting: 'Connecting…', starting: 'Starting…', queued: 'Queued…' }
  const label =
    phase === 'uploading'
      ? `Uploading ${Math.round(progress)}%`
      : PHASE_LABELS[phase] || 'Move to cloud'

  // One provider → move straight there; several → open the picker menu.
  const onButtonClick = () => {
    if (busy) return
    if (providers.length === 1) move(providers[0].name)
    else setMenuOpen((v) => !v)
  }

  const choose = (name) => {
    setMenuOpen(false)
    move(name)
  }

  return (
    <div ref={rootRef} className="relative flex flex-col items-stretch gap-1 min-w-[9rem]">
      <button
        type="button"
        onClick={onButtonClick}
        disabled={busy}
        aria-haspopup={providers.length > 1 ? 'menu' : undefined}
        aria-expanded={providers.length > 1 ? menuOpen : undefined}
        className="flex items-center justify-center gap-1 text-primary font-label-sm text-label-sm whitespace-nowrap border border-primary px-3 py-1 rounded-full hover:bg-primary/5 transition-colors active:scale-95 disabled:opacity-70 disabled:cursor-default disabled:active:scale-100"
      >
        <span
          className={`material-symbols-outlined text-[16px] ${busy ? 'animate-spin' : ''}`}
          style={busy ? undefined : { fontVariationSettings: "'FILL' 1" }}
        >
          {busy ? 'progress_activity' : 'cloud_upload'}
        </span>
        {label}
      </button>

      {menuOpen && !busy && (
        <div
          role="menu"
          className="absolute top-full left-0 right-0 mt-1 z-10 bg-surface-container-high border border-outline-variant rounded-lg shadow-lg overflow-hidden"
        >
          {providers.map((p) => (
            <button
              key={p.name}
              type="button"
              role="menuitem"
              onClick={() => choose(p.name)}
              className="flex items-center gap-2 w-full px-3 py-2 text-on-surface font-label-sm text-label-sm hover:bg-primary/10 transition-colors text-left"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {phase === 'uploading' && (
        <div className="h-1 w-full bg-surface-variant rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default MoveToCloud
