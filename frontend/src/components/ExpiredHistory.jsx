import { Link } from 'react-router-dom'
import { RefreshCw, X, Clock } from 'lucide-react'

function ExpiredHistory({ downloads, onForget }) {
  if (!downloads || downloads.length === 0) return null

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString()

  return (
    <div className="history-section expired-section">
      <h2>Recently Expired ({downloads.length})</h2>
      <p className="expired-hint">
        These files were removed from the server after 24 hours. Re-download to get them back.
      </p>
      <div className="history-list">
        {downloads.map((download) => (
          <div key={download.downloadId} className="history-item expired">
            {download.thumbnail ? (
              <img
                src={download.thumbnail}
                alt={download.title}
                className="history-thumb"
              />
            ) : (
              <div
                className="history-thumb"
                style={{
                  background: '#e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Clock size={24} color="#999" />
              </div>
            )}

            <div className="history-info">
              <h3 title={download.title}>{download.title}</h3>
              <p>Originally downloaded {formatDate(download.createdAt)}</p>
            </div>

            <div className="history-actions">
              {download.url && (
                <Link
                  to={`/info?url=${encodeURIComponent(download.url)}`}
                  className="action-btn primary"
                  title="Re-download"
                >
                  <RefreshCw size={14} />
                </Link>
              )}
              <button
                onClick={() => onForget(download.downloadId)}
                className="action-btn secondary"
                title="Forget"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ExpiredHistory
