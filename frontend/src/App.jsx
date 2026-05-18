import { Link, Outlet } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="header-link">
          <h1>Video Downloader</h1>
        </Link>
        <p>Download videos from YouTube and other platforms</p>
      </header>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

export default App
