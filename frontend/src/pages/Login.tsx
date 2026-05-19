import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'

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
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  // Load Google Identity Services
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
    try {
      const res = await authService.loginWithPassword(email, password)
      setAuth(res.user, res.access, res.refresh)
      navigate('/home')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* Logo placeholder */}
          <div className="w-16 h-16 bg-mustard rounded-full flex items-center justify-center font-bold text-2xl text-black mx-auto mb-4">
            <img src="/public/logo.png" alt="Skinovation Sciences" />
          </div>
          <h1 className="text-2xl font-semibold text-black">Skinovation Sciences CRM</h1>
          <p className="text-sm text-black/60 mt-1">We help our clients succeed</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Sign in</h2>

          {/* Google Login */}
          <div id="googleBtn" className="flex justify-center mb-4" aria-label="Sign in with Google" />

          {!googleClientId && (
            <p className="text-xs text-black/50 text-center mb-4">
              Google Sign-In not configured. Use email & password below.
            </p>
          )}

          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-black/10" /></div>
            <span className="relative bg-white px-2 text-xs text-black/50 uppercase">or</span>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block mb-1">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="password" className="block mb-1">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                aria-required="true"
              />
            </div>
            {error && (
              <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-xs text-black/50 text-center mt-6">
          Don't have an account? Please contact your admin.
        </p>
      </div>
    </div>
  )
}
