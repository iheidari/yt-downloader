import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div className="status-card">
      <h2>Page not found</h2>
      <p>The page you were looking for doesn&apos;t exist.</p>
      <div className="status-card-actions">
        <Link to="/" className="action-btn primary">
          Back to home
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage
