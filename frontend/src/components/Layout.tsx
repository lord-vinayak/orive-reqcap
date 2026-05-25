import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

const BASE_TITLE = "Skinovation Sciences CRM";

export default function Layout({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

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
            aria-label="Home"
          >
            <div className="w-10 h-10 rounded flex items-center justify-center font-bold text-black dark:text-white">
              <img src="/logo.png" alt="Skinovation Sciences" />
            </div>
            <div>
              <div className="font-semibold text-black dark:text-slate-100 leading-tight">
                Skinovation Sciences
              </div>
              <div className="text-xs text-black/60 dark:text-slate-400 leading-tight">
                We help our clients succeed
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-2" aria-label="Primary">
            {user?.role === "admin" && (
              <>
                <Link to="/admin/users" className="btn-secondary text-sm">
                  Users
                </Link>
                <Link to="/admin/catalog" className="btn-secondary text-sm">
                  Catalog
                </Link>
              </>
            )}
            <span className="text-sm text-black/60 dark:text-slate-400 px-2">
              {user?.name}
            </span>

            {/* Dark mode toggle */}
            <AnimatedThemeToggler />

            <button
              onClick={handleLogout}
              className="btn-secondary text-sm"
              aria-label="Log out"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main
        id="main-content"
        role="main"
        className="max-w-7xl mx-auto px-6 py-8"
      >
        {children}
      </main>
    </div>
  );
}
