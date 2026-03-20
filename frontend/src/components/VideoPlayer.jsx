import { Play, Download, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'

function VideoPlayer({ download, apiUrl, onReset }) {
  const [loadError, setLoadError] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const isAudio = download.filename.match(/\.(mp3|m4a|ogg|opus)$/i)
  
  // Build the stream URL
  const encodedFilename = encodeURIComponent(download.filename)
  const streamUrl = `${apiUrl}/api/files/${download.downloadId}/${encodedFilename}`
  const downloadUrl = `${apiUrl}/api/files/${download.downloadId}/${encodedFilename}?action=download`

  useEffect(() => {
    // Reset states when download changes
    setLoadError(false)
    setIsReady(false)
  }, [download.downloadId])

  // Try to check if file exists by making a HEAD request
  useEffect(() => {
    const checkFile = async () => {
      try {
        const response = await fetch(streamUrl, { method: 'HEAD' })
        if (!response.ok) {
          console.error('File check failed:', response.status)
          setLoadError(true)
        } else {
          setIsReady(true)
        }
      } catch (err) {
        console.error('File check error:', err)
        // Don't set error here - let the video element try anyway
        setIsReady(true)
      }
    }
    checkFile()
  }, [streamUrl])

  const handleMediaError = (e) => {
    console.error('Media error:', e)
    // Only show error if we can't play at all
    setLoadError(true)
  }

  const handleCanPlay = () => {
    console.log('Media can play')
    setLoadError(false)
  }

  return (
    <div className="video-player-container">
      <div 
        style={{ 
          background: '#000', 
          borderRadius: 12, 
          overflow: 'hidden',
          marginBottom: 20,
          minHeight: '200px'
        }}
      >
        {loadError ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: '#dc2626',
            background: '#fee2e2',
            padding: 20,
            textAlign: 'center'
          }}>
            <p>
              Unable to play this video. The file may have expired or been deleted.<br />
              Try downloading it instead.
            </p>
          </div>
        ) : (
          isAudio ? (
            <audio 
              controls 
              style={{ width: '100%', display: 'block' }}
              src={streamUrl}
              onError={handleMediaError}
              onCanPlay={handleCanPlay}
            />
          ) : (
            <video 
              controls 
              style={{ width: '100%', maxHeight: '60vh', display: 'block' }}
              src={streamUrl}
              onError={handleMediaError}
              onCanPlay={handleCanPlay}
              playsInline
            />
          )
        )}
      </div>
      
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 8 }}>{download.title}</h3>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          {formatFileSize(download.size)} • Downloaded on {formatDate(download.createdAt)}
        </p>
        {!isReady && !loadError && (
          <p style={{ color: '#999', fontSize: '0.8rem', marginTop: 4 }}>
            Loading...
          </p>
        )}
      </div>
      
      <div className="player-actions">
        <a 
          href={streamUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="action-btn primary"
        >
          <Play size={18} />
          Open in New Tab
        </a>
        
        <a 
          href={downloadUrl}
          download={download.filename}
          className="action-btn secondary"
        >
          <Download size={18} />
          Download File
        </a>
        
        <button 
          onClick={onReset}
          className="action-btn secondary"
        >
          <Plus size={18} />
          Download Another
        </button>
      </div>
    </div>
  )
}

export default VideoPlayer
