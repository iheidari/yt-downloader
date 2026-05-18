import { useNavigate } from 'react-router-dom'
import UrlInput from '../components/UrlInput'
import DownloadHistory from '../components/DownloadHistory'
import ExpiredHistory from '../components/ExpiredHistory'
import { useHistory } from '../context/useHistory'

function HomePage() {
  const navigate = useNavigate()
  const { history, expired, apiUrl, removeDownload, forgetExpired } = useHistory()

  const handleSubmit = (url) => {
    navigate(`/info?url=${encodeURIComponent(url)}`)
  }

  return (
    <>
      <UrlInput onSubmit={handleSubmit} loading={false} />
      <DownloadHistory
        downloads={history}
        apiUrl={apiUrl}
        onDelete={removeDownload}
      />
      <ExpiredHistory
        downloads={expired}
        onForget={forgetExpired}
      />
    </>
  )
}

export default HomePage
