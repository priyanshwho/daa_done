import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navigation from './components/Navigation'
import Home from './Landing/home'
import Interaction from './pages/interaction'
import DashboardPage from './pages/dash/demo'

const ScrollRestoration = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)

  const toggleTheme = () => {
    setIsDarkMode((previous) => !previous)
  }

  return (
    <div className={`app-root ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
      <ScrollRestoration />
      <Navigation isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

      <Routes>
        <Route path="/" element={<Home isDarkMode={isDarkMode} />} />
        <Route path="/interact" element={<Interaction />} />
        <Route path="/dashboard" element={<DashboardPage isDarkMode={isDarkMode} />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>

      <footer
        className={`fixed bottom-4 right-6 text-[10px] pointer-events-none z-50 transition-colors duration-500 ${
          isDarkMode ? 'text-white/30' : 'text-black/30'
        }`}
      >
        <p>&copy; {new Date().getFullYear()} Deconstruct.</p>
      </footer>
    </div>
  )
}

export default App