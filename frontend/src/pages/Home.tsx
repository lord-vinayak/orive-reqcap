import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { SquarePen, StickyNotePlus } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [showSoon, setShowSoon] = useState(false);
  const closeSoon = () => setShowSoon(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Move focus into dialog when it opens; restore on close
  useEffect(() => {
    if (showSoon) {
      // Small delay so the element is in the DOM
      const timer = setTimeout(() => {
        const focusable = dialogRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        focusable?.focus()
      }, 10)
      return () => clearTimeout(timer)
    } else {
      triggerRef.current?.focus()
    }
  }, [showSoon])

  // Escape key closes dialog; trap Tab inside it
  useEffect(() => {
    if (!showSoon) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeSoon(); return }
      if (e.key !== 'Tab') return
      const el = dialogRef.current
      if (!el) return
      const focusableEls = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const first = focusableEls[0]
      const last = focusableEls[focusableEls.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showSoon])

  return (
    <Layout title="Home">
      <div className="max-w-3xl mx-auto pt-8">
        <h1 className="text-3xl font-semibold text-black dark:text-slate-100 mb-2">Welcome</h1>
        <p className="text-black/60 dark:text-slate-400 mb-10">
          Choose what you'd like to do today.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/requirements")}
            className="card text-left hover:border-mustard transition-colors group"
            aria-label="Capture client requirements">
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl text-mustard-700">
                <StickyNotePlus />
              </span>
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-slate-100 mb-1">Capture Requirement</h2>
            <p className="text-sm text-black/60 dark:text-slate-400">
              Create or edit client product requirements.
            </p>
          </button>

          <button
            ref={triggerRef}
            onClick={() => setShowSoon(true)}
            className="card text-left hover:border-mustard transition-colors group"
            aria-label="Track project (coming soon)"
            aria-haspopup="dialog">
            <div className="w-12 h-12 bg-mustard-50 dark:bg-mustard-100 rounded flex items-center justify-center mb-4 group-hover:bg-mustard transition-colors">
              <span className="text-2xl text-mustard-700">
                <SquarePen />
              </span>
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-slate-100 mb-1">Track Project</h2>
            <p className="text-sm text-black/60 dark:text-slate-400">Project tracking.</p>
          </button>
        </div>
      </div>

      {showSoon && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50"
          aria-hidden="true"
          onClick={closeSoon}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="soon-title"
            className="card max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="soon-title" className="text-lg font-semibold text-black dark:text-slate-100 mb-2">
              Coming Soon
            </h3>
            <p className="text-sm text-black/70 dark:text-slate-300 mb-4">This feature is coming soon.</p>
            <button
              onClick={closeSoon}
              className="btn-primary w-full"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
