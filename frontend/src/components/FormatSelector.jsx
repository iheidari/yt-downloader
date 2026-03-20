import { useState } from 'react'
import { Download, X, Music, Monitor, Video } from 'lucide-react'

function FormatSelector({ info, onDownload, onCancel }) {
  const [selectedFormat, setSelectedFormat] = useState(null)
  const [formatType, setFormatType] = useState('combined')

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleDownload = () => {
    if (selectedFormat) {
      onDownload(selectedFormat, formatType)
    }
  }

  // Remove duplicate resolutions and prefer higher quality formats
  const getUniqueResolutions = (formats) => {
    const seen = new Map()
    return formats.filter(format => {
      const res = format.resolution
      if (!res || res === 'audio only') return false
      
      // Keep the first (usually best) format for each resolution
      if (!seen.has(res)) {
        seen.set(res, true)
        return true
      }
      return false
    })
  }

  // Filter and sort video formats by quality (highest first)
  const uniqueVideoFormats = info.formats.video
    ? getUniqueResolutions([...info.formats.video].sort((a, b) => {
        // Extract height from resolution (e.g., "1920x1080" -> 1080)
        const getHeight = (res) => {
          const match = res.match(/(\d+)x(\d+)/)
          return match ? parseInt(match[2]) : 0
        }
        return getHeight(b.resolution) - getHeight(a.resolution)
      }))
    : []

  return (
    <div className="format-selector">
      <div className="video-preview">
        <img 
          src={info.thumbnail} 
          alt={info.title}
          className="thumbnail"
        />
        <div className="video-details">
          <h2>{info.title}</h2>
          <p className="video-meta">
            <strong>Channel:</strong> {info.uploader}
          </p>
          <p className="video-meta">
            <strong>Duration:</strong> {formatDuration(info.duration)}
          </p>
          <p className="video-meta">
            <strong>Upload Date:</strong> {info.uploadDate}
          </p>
        </div>
      </div>

      {/* High Quality Video (separate video + audio) */}
      {uniqueVideoFormats.length > 0 && (
        <div className="format-section">
          <h3><Video size={18} style={{ marginRight: 8 }} /> Video Quality (HD/4K) - Auto-merges with Audio</h3>
          <div className="format-list">
            {uniqueVideoFormats.map((format) => (
              <label key={format.formatId} className="format-option">
                <input
                  type="radio"
                  name="format"
                  checked={selectedFormat === format.formatId && formatType === 'video'}
                  onChange={() => {
                    setSelectedFormat(format.formatId)
                    setFormatType('video')
                  }}
                />
                <div className="format-info">
                  <span className="format-label">{format.resolution} - {format.formatNote}</span>
                  <span className="format-details">
                    {format.ext.toUpperCase()} • {formatFileSize(format.filesize)} • Will merge with best audio
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Pre-merged formats (lower quality but ready to use) */}
      {info.formats.combined.length > 0 && (
        <div className="format-section">
          <h3><Monitor size={18} style={{ marginRight: 8 }} /> Ready to Use (Pre-merged)</h3>
          <div className="format-list">
            {info.formats.combined.map((format) => (
              <label key={format.formatId} className="format-option">
                <input
                  type="radio"
                  name="format"
                  checked={selectedFormat === format.formatId && formatType === 'combined'}
                  onChange={() => {
                    setSelectedFormat(format.formatId)
                    setFormatType('combined')
                  }}
                />
                <div className="format-info">
                  <span className="format-label">{format.resolution} - {format.formatNote}</span>
                  <span className="format-details">
                    {format.ext.toUpperCase()} • {formatFileSize(format.filesize)}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {info.formats.audio.length > 0 && (
        <div className="format-section">
          <h3><Music size={18} style={{ marginRight: 8 }} /> Audio Only</h3>
          <div className="format-list">
            {info.formats.audio.map((format) => (
              <label key={format.formatId} className="format-option">
                <input
                  type="radio"
                  name="format"
                  checked={selectedFormat === format.formatId && formatType === 'audio'}
                  onChange={() => {
                    setSelectedFormat(format.formatId)
                    setFormatType('audio')
                  }}
                />
                <div className="format-info">
                  <span className="format-label">{format.abr} kbps</span>
                  <span className="format-details">
                    {format.ext.toUpperCase()} • {formatFileSize(format.filesize)}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="actions">
        <button onClick={onCancel} className="cancel-btn">
          <X size={18} style={{ marginRight: 8 }} />
          Cancel
        </button>
        <button 
          onClick={handleDownload} 
          className="download-btn"
          disabled={!selectedFormat}
        >
          <Download size={18} style={{ marginRight: 8 }} />
          Download
        </button>
      </div>
    </div>
  )
}

export default FormatSelector
