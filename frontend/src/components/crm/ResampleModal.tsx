import { useRef, useState } from 'react'

interface Props {
  cycleFrom: number
  onConfirm: (reason: string) => Promise<void>
  onClose: () => void
}

export default function ResampleModal({ cycleFrom, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Please enter a reason before confirming.')
      textareaRef.current?.focus()
      return
    }
    setError('')
    setSaving(true)
    try {
      await onConfirm(reason.trim())
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Resample reason">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 space-y-4">

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-black dark:text-white">Confirm Resample — Cycle {cycleFrom + 1}</h2>
            <p className="text-sm text-black/60 dark:text-slate-400 mt-0.5">
              This will start a new development cycle. Enter the reason below — it will be visible to all team members.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-black/60 dark:text-slate-400 mb-1">
            Reason for resampling <span className="text-red-500">*</span>
          </label>
          <textarea
            ref={textareaRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
            rows={4}
            placeholder="e.g. Texture too thick, client requested lighter consistency…"
            className="w-full text-sm border border-black/20 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-black dark:text-white placeholder-black/30 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-mustard resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-500" role="alert">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 text-sm border border-black/20 dark:border-white/20 rounded-xl text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !reason.trim()}
            className="flex-1 py-2.5 text-sm bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl disabled:opacity-40 transition-colors"
          >
            {saving ? 'Submitting…' : 'Confirm Resample'}
          </button>
        </div>
      </div>
    </div>
  )
}
