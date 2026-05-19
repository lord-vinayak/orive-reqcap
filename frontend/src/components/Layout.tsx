import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-full bg-white">
      <header className="border-b border-black/10 bg-white" role="banner">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-3 group" aria-label="Home">
            {/* Logo placeholder — replace by dropping a file in /public/logo.png */}
            <div className="w-10 h-10 rounded flex items-center justify-center font-bold text-black">
              <img src="/logo.png" alt="Skinovation Sciences" />
            </div>
            <div>
              <div className="font-semibold text-black leading-tight">Skinovation Sciences</div>
              <div className="text-xs text-black/60 leading-tight">We help our clients succeed</div>
            </div>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Primary">
            {user?.role === 'admin' && (
              <>
                <Link to="/admin/users" className="btn-secondary text-sm">Users</Link>
                <Link to="/admin/catalog" className="btn-secondary text-sm">Catalog</Link>
              </>
            )}
            <span className="text-sm text-black/60 px-2">{user?.name}</span>
            <button onClick={handleLogout} className="btn-secondary text-sm" aria-label="Log out">
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main role="main" className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
