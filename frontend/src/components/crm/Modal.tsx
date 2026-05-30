import { useEffect, useRef } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ title, onClose, children, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus first focusable element on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>(
        'input, select, textarea, button:not([data-close-btn]), [tabindex]:not([tabindex="-1"])'
      )
      focusable?.focus()
    }, 10)
    return () => clearTimeout(timer)
  }, [])

  // Escape closes; Tab trapped inside
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const el = dialogRef.current
      if (!el) return
      const focusableEls = Array.from(
        el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled'))
      if (!focusableEls.length) return
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
  }, [onClose])

  const widthClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg'

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50 overflow-y-auto"
      aria-hidden="true"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full ${widthClass} my-8`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <h2 id="modal-title" className="text-lg font-semibold text-black dark:text-white">
            {title}
          </h2>
          <button
            data-close-btn
            onClick={onClose}
            className="text-black/40 hover:text-black dark:text-slate-500 dark:hover:text-white text-xl leading-none focus-visible:ring-2 focus-visible:ring-mustard rounded p-1"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
