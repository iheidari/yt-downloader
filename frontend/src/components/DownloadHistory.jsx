import { useState } from 'react'
import { Play, Download, Trash2, Clock, Video, Music } from 'lucide-react'

function DownloadHistory({ downloads, apiUrl, onDelete, onPlay }) {
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getTimeRemaining = (createdAt) => {
    const created = new Date(createdAt)
    const expires = new Date(created.getTime() + 24 * 60 * 60 * 1000)
    const now = new Date()
    const hoursLeft = Math.max(0, Math.floor((expires - now) / (1000 * 60 * 60)))
    return hoursLeft
  }

  if (downloads.length === 0) {
    return (
      <div className="history-section">
        <h2>Download History</h2>
        <div className="empty-history">
          No downloads yet. Start by entering a video URL above!
        </div>
      </div>
    )
  }

  return (
    <div className="history-section">
      <h2>Download History ({downloads.length})</h2>
      <div className="history-list">
        {downloads.map((download) => {
          const hoursLeft = getTimeRemaining(download.createdAt)
          const isExpired = hoursLeft === 0
          const isAudio = download.filename.match(/\.(mp3|m4a|ogg|opus)$/i)
          const downloadUrl = `${apiUrl}/api/files/${download.downloadId}/${encodeURIComponent(download.filename)}?action=download`

          return (
            <div key={download.downloadId} className={`history-item ${isExpired ? 'expired' : ''}`}>
              {download.thumbnail ? (
                <img 
                  src={download.thumbnail} 
                  alt={download.title}
                  className="history-thumb"
                />
              ) : (
                <div className="history-thumb" style={{ 
                  background: '#f0f0f0', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {isAudio ? <Music size={24} color="#999" /> : <Video size={24} color="#999" />}
                </div>
              )}
              
              <div className="history-info">
                <h3 title={download.title}>{download.title}</h3>
                <p>
                  {formatFileSize(download.size)} • {formatDate(download.createdAt)}
                </p>
                <p style={{ 
                  color: hoursLeft < 4 ? '#dc2626' : '#667eea',
                  fontSize: '0.8rem',
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Clock size={12} />
                  {isExpired ? 'Expired' : `${hoursLeft}h remaining`}
                </p>
              </div>
              
              <div className="history-actions">
                {!isExpired && (
                  <>
                    <button 
                      onClick={() => onPlay(download)}
                      className="action-btn primary"
                      title="Play"
                    >
                      <Play size={14} />
                    </button>
                    
                    <a 
                      href={downloadUrl}
                      download={download.filename}
                      className="action-btn secondary"
                      title="Download"
                    >
                      <Download size={14} />
                    </a>
                  </>
                )}
                
                <button 
                  onClick={() => onDelete(download.downloadId)}
                  className="action-btn danger"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DownloadHistory
