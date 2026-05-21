import { Link, useNavigate } from 'react-router-dom'
import UrlInput from '../components/UrlInput'
import { useHistory } from '../context/useHistory'

function HomePage() {
  const navigate = useNavigate()
  const { history, expired } = useHistory()
  const total = history.length + expired.length

  const handleSubmit = (url) => {
    navigate(`/info?url=${encodeURIComponent(url)}`)
  }

  return (
    <>
      <UrlInput onSubmit={handleSubmit} loading={false} />
      {total > 0 && (
        <div className="mt-stack-md flex justify-center">
          <Link
            to="/downloads"
            className="inline-flex items-center gap-2 text-secondary hover:text-primary font-label-md text-label-md transition-colors group"
          >
            View your downloads ({total})
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
        </div>
      )}
    </>
  )
}

export default HomePage
