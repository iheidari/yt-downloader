import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import { useHistory } from '../context/useHistory'
import { fetchDownloads } from '../lib/media'

const WATCH_POLL_MS = 2000
const WATCH_TIMEOUT_MS = 5 * 60 * 1000
const startKey = (id) => `tk_start_${id}`

function DownloadPage() {
  const { downloadId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { apiUrl, addDownload } = useHistory()

  // Start params normally arrive via router state, but a reload of /download/:id
  // wipes that — recover them from sessionStorage (per-tab, written at start)
  // so the SSE resumes and the "Keep forever" choice isn't silently dropped.
  const stateStart = location.state?.start ? location.state : null
  const startParams = useMemo(() => {
    if (stateStart) return stateStart
    try {
      const saved = sessionStorage.getItem(startKey(downloadId))
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore malformed/unavailable sessionStorage
    }
    return null
  }, [stateStart, downloadId])

  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Defer side-effect setup to a microtask so React StrictMode's
    // synchronous double-mount cleanup cancels the duplicate before it runs.
    // Without this, opening the EventSource on mount #1 + closing on its
    // cleanup leaves no live connection (and would also spawn yt-dlp twice).
    let eventSource = null
    let pollCancelled = false
    let pollTimer = null
    const clearStart = () => {
      try {
        sessionStorage.removeItem(startKey(downloadId))
      } catch {
        // ignore
      }
    }
    const startTimer = setTimeout(() => {
      if (startParams) {
        const qs = new URLSearchParams({
          url: startParams.url,
          formatId: startParams.formatId,
          type: startParams.type,
          title: startParams.title || '',
          thumbnail: startParams.thumbnail || '',
          keep: startParams.keep ? 'true' : 'false',
        })

        eventSource = new EventSource(
          `${apiUrl}/api/download/progress/${downloadId}?${qs.toString()}`,
        )

        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data)
          if (data.type === 'ping') return
          if (data.type === 'progress') {
            setProgress(data.progress)
          } else if (data.type === 'complete') {
            setProgress(100)
            addDownload(data.data)
            clearStart()
            eventSource.close()
            navigate(`/play/${downloadId}`, { replace: true })
          } else if (data.type === 'error') {
            setError(data.error || 'Download failed')
            clearStart()
            eventSource.close()
          }
        }

        eventSource.onerror = async () => {
          eventSource.close()
          // onerror also fires on transient proxy blips / a dropped keep-alive,
          // even when the download finished server-side. Reconcile against the
          // file list before declaring failure.
          try {
            const all = await fetchDownloads(apiUrl)
            if (pollCancelled) return
            const found = all.find((d) => d.downloadId === downloadId && !d.expired)
            if (found) {
              addDownload(found)
              clearStart()
              navigate(`/play/${downloadId}`, { replace: true })
              return
            }
          } catch {
            // fall through to the error state
          }
          if (!pollCancelled) setError('Download connection lost')
        }
      } else {
        const start = Date.now()
        const poll = async () => {
          if (pollCancelled) return
          try {
            const all = await fetchDownloads(apiUrl)
            if (pollCancelled) return
            const found = all.find((d) => d.downloadId === downloadId && !d.expired)
            if (found) {
              addDownload(found)
              navigate(`/play/${downloadId}`, { replace: true })
              return
            }
            if (Date.now() - start > WATCH_TIMEOUT_MS) {
              setError('Download not found or timed out. It may have failed.')
              return
            }
          } catch (err) {
            console.error('❌ Poll error:', err)
          }
          pollTimer = setTimeout(poll, WATCH_POLL_MS)
        }
        poll()
      }
    }, 0)

    return () => {
      clearTimeout(startTimer)
      pollCancelled = true
      if (pollTimer) clearTimeout(pollTimer)
      if (eventSource) eventSource.close()
    }
  }, [apiUrl, downloadId, startParams, addDownload, navigate])

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-error-container border border-error rounded-xl p-6 text-center">
          <span className="material-symbols-outlined text-[40px] text-error mb-2 block">error</span>
          <p className="font-body-md text-body-md text-on-error-container mb-4">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    )
  }

  if (!startParams) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-12 text-center">
          <span className="material-symbols-outlined animate-spin text-[40px] text-primary mb-3 block">
            progress_activity
          </span>
          <p className="font-body-md text-body-md text-secondary">Download in progress…</p>
          <p className="font-label-sm text-label-sm text-secondary mt-2">
            Checking back every few seconds.
          </p>
        </div>
      </div>
    )
  }

  return <ProgressBar progress={progress} />
}

export default DownloadPage
