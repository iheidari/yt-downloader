import { useState } from 'react'
import { Link, Loader2 } from 'lucide-react'

function UrlInput({ onSubmit, loading }) {
  const [url, setUrl] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (url.trim()) {
      onSubmit(url.trim())
    }
  }

  return (
    <div className="url-input-container">
      <form onSubmit={handleSubmit} className="url-form">
        <input
          type="url"
          placeholder="Enter video URL (YouTube, etc.)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="url-input"
          required
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="submit-btn"
        >
          {loading ? (
            <>
              <Loader2 size={18} style={{ marginRight: 8, animation: 'spin 1s linear infinite' }} />
              Loading...
            </>
          ) : (
            <>
              <Link size={18} style={{ marginRight: 8 }} />
              Get Info
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export default UrlInput
