import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import VideoPlayer from '../components/VideoPlayer'
import { useHistory } from '../context/useHistory'

function PlayPageContent({ downloadId }) {
  const { history, apiUrl, findById } = useHistory()
  const [coldResult, setColdResult] = useState({ status: 'pending', data: null })

  const fromContext = history.find(d => d.downloadId === downloadId) || null

  useEffect(() => {
    if (fromContext) return
    let cancelled = false

    fetch(`${apiUrl}/api/files`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.success && Array.isArray(data.data)) {
          const found = data.data.find(d => d.downloadId === downloadId)
          if (found) {
            setColdResult({
              status: 'found',
              data: {
                ...found,
                fileUrl: `${apiUrl}/api/files/${found.downloadId}/${encodeURIComponent(found.filename)}`
              }
            })
            return
          }
        }
        setColdResult({ status: 'missing', data: findById(downloadId) })
      })
      .catch(() => {
        if (!cancelled) {
          setColdResult({ status: 'missing', data: findById(downloadId) })
        }
      })

    return () => { cancelled = true }
  }, [downloadId, fromContext, apiUrl, findById])

  const resolved = fromContext || (coldResult.status === 'found' ? coldResult.data : null)
  const missing = !fromContext && coldResult.status === 'missing'

  if (missing) {
    const stale = coldResult.data
    return (
      <div className="status-card">
        <h2>File not found</h2>
        <p>This download may have expired (files are deleted after 24 hours).</p>
        <div className="status-card-actions">
          {stale?.url && (
            <Link
              to={`/info?url=${encodeURIComponent(stale.url)}`}
              className="action-btn primary"
            >
              Re-download
            </Link>
          )}
          <Link to="/" className="action-btn secondary">Back to home</Link>
        </div>
      </div>
    )
  }

  if (!resolved) {
    return (
      <div className="status-card">
        <p className="loading">Loading…</p>
      </div>
    )
  }

  return <VideoPlayer download={resolved} apiUrl={apiUrl} />
}

function PlayPage() {
  const { downloadId } = useParams()
  return <PlayPageContent key={downloadId} downloadId={downloadId} />
}

export default PlayPage
