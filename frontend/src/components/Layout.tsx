import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

const BASE_TITLE = "Skinovation Sciences CRM";

// Routes where a Back link is suppressed.
const NO_BACK_ROUTES = ["/home", "/login", "/", "/crm/dashboard", "/crm/clients", "/crm/projects", "/crm/master-data", "/tasks"];

export default function Layout({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (menuOpen) firstMenuItemRef.current?.focus()
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    document.title = title ? `${title} – ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const showBack = !NO_BACK_ROUTES.includes(location.pathname);

  return (
    <div className="min-h-full bg-white dark:bg-slate-900">
      {/* Skip navigation — visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-mustard focus:text-black focus:font-medium focus:rounded focus:shadow-lg"
      >
        Skip to main content
      </a>

      <header
        className="border-b border-black/10 dark:border-white/10 bg-white dark:bg-slate-800"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            to="/home"
            className="flex items-center gap-3 group"
            aria-label="Skinovation Sciences home"
          >
            <div className="w-10 h-10 rounded flex items-center justify-center font-bold text-black dark:text-white">
              <img src="/logo.png" alt="Skinovation Sciences" />
            </div>
            <div>
              <div className="font-semibold text-black dark:text-slate-100 leading-tight">
                Skinovation Sciences
              </div>
              <div className="text-xs text-black/60 dark:text-slate-300 leading-tight">
                Making Bharat the Skincare Factory of the world
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-2 flex-wrap" aria-label="Primary">
            <Link to="/home" className="btn-secondary text-sm" aria-label="Go to Home page">
              Home
            </Link>
            <Link to="/crm/clients" className="btn-secondary text-sm" aria-label="Go to CRM Clients">
              Clients
            </Link>
            <Link to="/crm/dashboard" className="btn-secondary text-sm" aria-label="Go to CRM Dashboard">
              CRM
            </Link>
            <Link to="/tasks" className="btn-secondary text-sm" aria-label="Go to Task Tracker">
              Tasks
            </Link>
            <Link to="/crm/master-data" className="btn-secondary text-sm" aria-label="Go to Master Data">
              Master Data
            </Link>
            {user?.role === "admin" && (
              <>
                <Link to="/admin/catalog" className="btn-secondary text-sm" aria-label="Go to Catalog">
                  Catalog
                </Link>
                <Link to="/admin/users" className="btn-secondary text-sm" aria-label="Go to Users">
                  Users
                </Link>
              </>
            )}
            {/* Dark mode toggle */}
            <AnimatedThemeToggler />

            {/* User menu */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="text-sm text-black/60 dark:text-slate-300 px-2 cursor-pointer hover:text-black dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard rounded"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`User menu for ${user?.name}`}
              >
                {user?.name}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded shadow-lg z-50 py-1"
                >
                  <button
                    ref={firstMenuItemRef}
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="w-full text-left px-4 py-2 text-sm text-black dark:text-white hover:bg-mustard/10 focus:bg-mustard/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mustard focus:outline-none"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main
        id="main-content"
        role="main"
        className="max-w-7xl mx-auto px-6 py-8"
      >
        {showBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-black/70 dark:text-slate-300 hover:text-black dark:hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard rounded px-1 -ml-1 mb-3"
            aria-label="Go back to previous page"
          >
            <span aria-hidden="true">←</span> Go Back
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
