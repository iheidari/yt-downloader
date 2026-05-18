import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import FormatSelector from '../components/FormatSelector'
import { useHistory } from '../context/useHistory'

function InfoPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { apiUrl } = useHistory()
  const url = searchParams.get('url')

  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!url) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setInfo(null)

    fetch(`${apiUrl}/api/info?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (!data.success) throw new Error(data.error)
        setInfo({ ...data.data, originalUrl: url })
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Failed to fetch video info')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [url, apiUrl])

  if (!url) return <Navigate to="/" replace />

  const handleDownload = async (formatId, type) => {
    setStarting(true)
    setError(null)
    try {
      const response = await fetch(`${apiUrl}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: info.originalUrl,
          formatId,
          type,
          title: info.title,
          thumbnail: info.thumbnail
        })
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      const { downloadId } = data.data
      navigate(`/download/${downloadId}`, {
        replace: true,
        state: {
          start: true,
          url: info.originalUrl,
          formatId,
          type,
          title: info.title,
          thumbnail: info.thumbnail
        }
      })
    } catch (err) {
      setError(err.message || 'Failed to start download')
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="status-card">
        <p className="loading">Fetching video info…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Back to home</button>
      </div>
    )
  }

  if (!info) return null

  return (
    <FormatSelector
      info={info}
      onDownload={handleDownload}
      onCancel={() => navigate('/')}
      disabled={starting}
    />
  )
}

export default InfoPage
