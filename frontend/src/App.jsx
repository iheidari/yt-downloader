import { Link, NavLink, Outlet } from 'react-router-dom'
import './App.css'
import Logo from './components/Logo'
import PlayerDock from './components/PlayerDock'
import ThemeToggle from './components/ThemeToggle'
import { usePlayer } from './context/usePlayer'

function App() {
  const { current, stageActive } = usePlayer()
  const dockVisible = !!current && !stageActive
  const navLinkClass = ({ isActive }) =>
    `font-label-md text-[13.5px] transition-colors px-3 py-2 rounded-lg ${
      isActive ? 'text-ink' : 'text-muted hover:text-ink'
    }`

  return (
    <div className="flex flex-col min-h-screen bg-bg text-ink">
      <header className="w-full top-0 sticky z-40 bg-surface/90 backdrop-blur border-b border-line">
        <div className="w-full flex justify-between items-center px-gutter py-4 max-w-container-max mx-auto">
          <Link to="/" className="no-underline" aria-label="Tubekeep home">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/downloads" className={navLinkClass}>
              Downloads
            </NavLink>
            <span className="w-px h-5 bg-line mx-1.5" aria-hidden="true" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        className={`flex-1 px-gutter py-stack-lg max-w-container-max mx-auto w-full ${
          dockVisible ? 'pb-24' : ''
        }`}
      >
        <Outlet />
      </main>

      <PlayerDock />
    </div>
  )
}

export default App
