import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'

declare global {
  interface Window { google?: any }
}

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [liveMsg, setLiveMsg] = useState('')
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    document.title = 'Sign In – Skinovation Sciences CRM'
    return () => { document.title = 'Skinovation Sciences CRM' }
  }, [])

  useEffect(() => {
    if (!googleClientId) return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
      })
      window.google?.accounts.id.renderButton(
        document.getElementById('googleBtn'),
        { theme: 'outline', size: 'large', width: 320, text: 'continue_with' }
      )
    }
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGoogleResponse = async (response: any) => {
    setError('')
    try {
      const res = await authService.loginWithGoogle(response.credential)
      setAuth(res.user, res.access, res.refresh)
      navigate('/home')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Google login failed')
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setLiveMsg('Signing in…')
    try {
      const res = await authService.loginWithPassword(email, password)
      setAuth(res.user, res.access, res.refresh)
      navigate('/home')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
      setLiveMsg('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Skip link */}
      <a
        href="#mainContent"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-mustard focus:text-black focus:font-medium focus:rounded focus:shadow-lg"
      >
        Skip to Main Content
      </a>

      {/* Shared live region */}
      <div id="liveRegion" className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMsg}
      </div>

      <div className="min-h-screen bg-white dark:bg-slate-900 px-4 py-6">
        <div className="mx-auto flex w-full max-w-6xl justify-end">
          <AnimatedThemeToggler />
        </div>

        <div className="flex items-center justify-center pt-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl text-black mx-auto mb-4">
                <img src="/logo.png" alt="Skinovation Sciences" />
              </div>
              <p className="text-2xl font-semibold text-black dark:text-slate-100">
                Welcome to Skinovation Sciences Data Management System (SDMS)
              </p>
              <p className="text-sm text-black/60 dark:text-slate-300 mt-1">
                Making Bharat the Skincare Factory of the world
              </p>
            </div>

            <div
              className="card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="loginTitle"
            >
              <h1
                id="loginTitle"
                tabIndex={-1}
                className="text-lg font-semibold mb-4 outline-none"
              >
                Sign in
              </h1>

              {/* Google Login */}
              <div id="googleBtn" className="flex justify-center mb-4" aria-label="Sign in with Google" />

              {!googleClientId && (
                <p className="text-xs text-black/70 text-center mb-4">
                  Google Sign-In not configured. Use email &amp; password below.
                </p>
              )}

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-black/10" />
                </div>
                <span className="relative bg-white dark:bg-slate-800 px-2 text-xs text-black/60 dark:text-slate-300 uppercase">or</span>
              </div>

              <form onSubmit={handlePasswordLogin} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="block mb-1">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="username"
                    required
                    aria-required="true"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block mb-1">Password</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    aria-required="true"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full"
                  />
                </div>
                {error && (
                  <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  id="signInBtn"
                  disabled={loading}
                  aria-busy={loading}
                  className="btn-primary w-full"
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            </div>

            <p className="text-xs text-black/60 dark:text-slate-300 text-center mt-6">
              Don't have an account? Please contact admin.
            </p>
          </div>
        </div>
      </div>

      <main id="mainContent" />
    </>
  )
}
