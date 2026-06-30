import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Tell the browser to stop managing scroll — React Router owns it now
if (typeof window !== 'undefined') window.history.scrollRestoration = 'manual'

export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    const h1 = document.querySelector<HTMLElement>('h1')
    if (h1) {
      h1.setAttribute('tabindex', '-1')
      h1.focus({ preventScroll: true })
    }
  }, [pathname])
  return null
}
