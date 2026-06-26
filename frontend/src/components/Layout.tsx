import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

function getPageName(pathname: string): string {
  if (pathname === "/" || pathname === "/home") return "Home"
  if (pathname.startsWith("/crm/dashboard")) return "CRM Dashboard"
  if (pathname.startsWith("/crm/clients")) return "Clients"
  if (pathname.startsWith("/crm/projects")) return "Projects"
  if (pathname.startsWith("/crm/master-data")) return "Master Data"
  if (pathname.startsWith("/tasks")) return "Tasks"
  if (pathname.startsWith("/admin/catalog")) return "Catalog"
  if (pathname.startsWith("/admin/users")) return "Users"
  if (pathname.startsWith("/requirements")) return "Requirements"
  return "Page"
}

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
  const mainRef = useRef<HTMLElement>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);
  const [liveMsg, setLiveMsg] = useState("");
  const isFirstRender = useRef(true);

  // aria-current helper — matches exact path or any sub-route
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  // Arrow key navigation across nav links (horizontal nav → ArrowLeft/Right;
  // also handles ArrowUp/Down to match the reference sidebar pattern)
  const handleNavKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const links = Array.from(navLinksRef.current?.querySelectorAll<HTMLElement>('a') ?? []);
    const index = links.indexOf(document.activeElement as HTMLElement);
    if (index === -1) return;
    e.preventDefault();
    const next = (e.key === 'ArrowRight' || e.key === 'ArrowDown')
      ? (index + 1) % links.length
      : (index - 1 + links.length) % links.length;
    links[next].focus();
  };

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

  // On every route change after first load: announce page name + move focus to main
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const name = title || getPageName(location.pathname);
    // Clear first so SR re-reads even when navigating to the same route twice
    setLiveMsg("");
    const announceId = setTimeout(() => setLiveMsg(`${name} page loaded`), 100);
    const focusId = setTimeout(() => mainRef.current?.focus(), 60);
    return () => {
      clearTimeout(announceId);
      clearTimeout(focusId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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
            {/* Arrow-key navigable link group */}
            <div ref={navLinksRef} className="flex items-center gap-2 flex-wrap" onKeyDown={handleNavKeyDown}>
              <Link to="/home" className="btn-secondary text-sm" aria-label="Go to Home page" aria-current={isActive("/home") ? "page" : undefined}>Home</Link>
              <Link to="/crm/clients" className="btn-secondary text-sm" aria-label="Go to CRM Clients" aria-current={isActive("/crm/clients") ? "page" : undefined}>Clients</Link>
              <Link to="/crm/dashboard" className="btn-secondary text-sm" aria-label="Go to CRM Dashboard" aria-current={isActive("/crm/dashboard") ? "page" : undefined}>CRM</Link>
              <Link to="/tasks" className="btn-secondary text-sm" aria-label="Tasks — Task Tracker" aria-current={isActive("/tasks") ? "page" : undefined}>Tasks</Link>
              <Link to="/crm/master-data" className="btn-secondary text-sm" aria-label="Go to Master Data" aria-current={isActive("/crm/master-data") ? "page" : undefined}>Master Data</Link>
              {user?.role === "admin" && (
                <>
                  <Link to="/admin/catalog" className="btn-secondary text-sm" aria-label="Go to Catalog" aria-current={isActive("/admin/catalog") ? "page" : undefined}>Catalog</Link>
                  <Link to="/admin/users" className="btn-secondary text-sm" aria-label="Go to Users" aria-current={isActive("/admin/users") ? "page" : undefined}>Users</Link>
                </>
              )}
            </div>
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
        ref={mainRef}
        role="main"
        tabIndex={-1}
        className="max-w-7xl mx-auto px-6 py-8 focus:outline-none"
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
      {/* Global route-change announcer for screen readers */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {liveMsg}
      </div>
    </div>
  );
}
