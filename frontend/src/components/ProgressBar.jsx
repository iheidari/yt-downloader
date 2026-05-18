function ProgressBar({ progress }) {
  return (
    <div className="progress-container">
      <h2>Downloading...</h2>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="progress-text">{progress.toFixed(1)}%</p>
    </div>
  )
}

export default ProgressBar
