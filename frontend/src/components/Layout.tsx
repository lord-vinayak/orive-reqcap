import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useDarkMode } from "@/hooks/useDarkMode";

const BASE_TITLE = "Skinovation Sciences CRM";

export default function Layout({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { dark, toggle } = useDarkMode();
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
            <button
              onClick={toggle}
              className="btn-secondary text-sm w-9 h-9 p-0 flex items-center justify-center"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              title={dark ? "Light mode" : "Dark mode"}
            >
              {dark ? (
                /* Sun icon */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              ) : (
                /* Moon icon */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

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
