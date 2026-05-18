import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import { useHistory } from '../context/useHistory'

const WATCH_POLL_MS = 2000
const WATCH_TIMEOUT_MS = 5 * 60 * 1000

function DownloadPage() {
  const { downloadId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { apiUrl, addDownload } = useHistory()

  const startParams = location.state?.start ? location.state : null
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    if (startParams) {
      const qs = new URLSearchParams({
        url: startParams.url,
        formatId: startParams.formatId,
        type: startParams.type,
        title: startParams.title || '',
        thumbnail: startParams.thumbnail || ''
      })

      const eventSource = new EventSource(
        `${apiUrl}/api/download/progress/${downloadId}?${qs.toString()}`
      )

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'ping') return
        if (data.type === 'progress') {
          setProgress(data.progress)
        } else if (data.type === 'complete') {
          setProgress(100)
          addDownload(data.data)
          eventSource.close()
          navigate(`/play/${downloadId}`, { replace: true })
        } else if (data.type === 'error') {
          setError(data.error || 'Download failed')
          eventSource.close()
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        setError('Download connection lost')
      }

      return () => eventSource.close()
    }

    const start = Date.now()
    let cancelled = false

    const poll = async () => {
      if (cancelled) return
      try {
        const response = await fetch(`${apiUrl}/api/files`)
        const data = await response.json()
        if (cancelled) return
        if (data.success && Array.isArray(data.data)) {
          const found = data.data.find(d => d.downloadId === downloadId)
          if (found) {
            addDownload(found)
            navigate(`/play/${downloadId}`, { replace: true })
            return
          }
        }
        if (Date.now() - start > WATCH_TIMEOUT_MS) {
          setError('Download not found or timed out. It may have failed.')
          return
        }
      } catch (err) {
        console.error('❌ Poll error:', err)
      }
      setTimeout(poll, WATCH_POLL_MS)
    }

    poll()
    return () => { cancelled = true }
  }, [apiUrl, downloadId, startParams, addDownload, navigate])

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Back to home</button>
      </div>
    )
  }

  if (!startParams) {
    return (
      <div className="progress-container">
        <h2>Download in progress…</h2>
        <p className="progress-text">Checking back every few seconds.</p>
      </div>
    )
  }

  return <ProgressBar progress={progress} />
}

export default DownloadPage
