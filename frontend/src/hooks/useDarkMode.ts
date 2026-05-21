import { useCallback, useState } from 'react'

/**
 * WCAG-compliant dark mode hook.
 *
 * Initialization is handled by the inline <script> in index.html which applies
 * the `dark` class to <html> synchronously before React mounts when the user
 * previously selected dark mode. This hook:
 *   - Reads initial state directly from the DOM so it is always in sync.
 *   - Toggles the `dark` class imperatively (no useEffect timing lag).
 *   - Persists the user's choice to localStorage.
 */
export function useDarkMode() {
  // Read initial state from the DOM — the index.html script already set it correctly.
  const [dark, setDark] = useState<boolean>(
    () => document.documentElement.classList.contains('dark')
  )

  const toggle = useCallback(() => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark')
    const next = !isCurrentlyDark

    // Imperatively toggle the class — no need to wait for a React effect.
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')

    // Update React state so icon and aria-label re-render.
    setDark(next)
  }, [])

  return { dark, toggle }
}
