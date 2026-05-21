import { Link, NavLink, Outlet } from 'react-router-dom'
import './App.css'

function App() {
  const navLinkClass = ({ isActive }) =>
    `font-label-md text-label-md transition-colors px-3 py-1 rounded-lg ${
      isActive
        ? 'text-primary bg-surface-container-high'
        : 'text-on-surface-variant hover:bg-surface-container-high'
    }`

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-background">
      <header className="w-full top-0 sticky z-40 bg-surface border-b border-surface-variant">
        <div className="w-full flex justify-between items-center px-gutter py-4 max-w-container-max mx-auto">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <h1 className="text-headline-md font-headline-md text-primary tracking-tight">
                Video Downloader
              </h1>
            </Link>
          </div>
          <div className="flex items-center gap-gutter">
            <div className="hidden md:flex items-center gap-2">
              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>
              <NavLink to="/downloads" className={navLinkClass}>
                Downloads
              </NavLink>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-gutter py-stack-lg max-w-container-max mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}

export default App
