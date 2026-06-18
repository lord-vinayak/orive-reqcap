import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Tell the browser to stop managing scroll — React Router owns it now
if (typeof window !== 'undefined') window.history.scrollRestoration = 'manual'

export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
