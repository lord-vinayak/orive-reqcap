import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import './login.css'

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
  const [loginSuccess, setLoginSuccess] = useState(false)
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
      setLiveMsg('Signed in successfully')
      setLoginSuccess(true)
      setTimeout(() => navigate('/home'), 800)
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

      <div className="login-page">
        {/* Theme toggler — top right, outside overlay */}
        <div style={{ position: 'absolute', top: '1rem', right: '1.5rem', zIndex: 10 }}>
          <AnimatedThemeToggler />
        </div>

        <div className="overlay">
          <div
            className="login-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="loginTitle"
          >
            {/* Logo */}
            <img src="/logo.png" alt="Skinovation Sciences" className="logo" />

            <h1
              id="loginTitle"
              tabIndex={-1}
              style={{ outline: 'none' }}
            >
              Sign in
            </h1>

            <p className="subtitle">
              Sign in to access Skinovation Sciences CRM
            </p>

            {/* Google Login */}
            <div id="googleBtn" className="flex justify-center mb-4" aria-label="Sign in with Google" />

            {!googleClientId && (
              <p className="text-xs text-center mb-4" style={{ color: '#64748B' }}>
                Google Sign-In not configured. Use email &amp; password below.
              </p>
            )}

            {googleClientId && (
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" style={{ borderColor: '#E5E7EB' }} />
                </div>
                <span className="relative px-2 text-xs uppercase" style={{ background: '#fff', color: '#94A3B8' }}>or</span>
              </div>
            )}

            <form onSubmit={handlePasswordLogin} noValidate>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="username"
                  required
                  aria-required="true"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  aria-required="true"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 text-sm rounded p-2"
                  style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca' }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                id="signInBtn"
                className="signin-btn"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="footer">
              Don't have an account? Please contact admin.
            </p>
          </div>
        </div>
      </div>

      <main id="mainContent" />

      {loginSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 text-white text-sm font-medium px-4 py-3 rounded shadow-lg"
          style={{ background: '#16a34a' }}
        >
          ✓ Signed in successfully
        </div>
      )}
    </>
  )
}
