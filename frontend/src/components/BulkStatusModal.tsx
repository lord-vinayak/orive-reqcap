import { useEffect, useId, useRef, useState } from 'react'
import { clientService } from '@/services'
import type { Client } from '@/types'
import { LEAD_STATUS_OPTIONS, LEAD_SUB_STATUS_OPTIONS } from '@/constants/clientStatus'
import type { LeadStatus } from '@/constants/clientStatus'

interface Props {
  clients: Client[]
  onClose: () => void
  onDone: (newStatus: LeadStatus, newSubStatus: string) => void
}

export function BulkStatusModal({ clients, onClose, onDone }: Props) {
  const titleId = useId()
  const selectId = useId()
  const subSelectId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | ''>('')
  const [selectedSubStatus, setSelectedSubStatus] = useState('')
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  const subStatusOptions = selectedStatus ? (LEAD_SUB_STATUS_OPTIONS[selectedStatus] ?? []) : []

  // Focus trap + Escape
  useEffect(() => {
    firstFocusableRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleStatusChange = (status: LeadStatus | '') => {
    setSelectedStatus(status)
    setSelectedSubStatus('') // reset sub-status when status changes
  }

  const handleConfirm = async () => {
    if (!selectedStatus) return
    setUpdating(true)
    setError('')
    try {
      const phoneNos = clients.map((c) => c.phone_no)
      await clientService.bulkUpdateLeadStatus(phoneNos, selectedStatus, selectedSubStatus)
      onDone(selectedStatus, selectedSubStatus)
    } catch {
      setError('Failed to update status. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <h2 id={titleId} className="text-lg font-semibold text-black dark:text-white">
            Change Lead Status
          </h2>
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            aria-label="Close change status dialog"
            className="text-black/50 dark:text-slate-400 hover:text-black dark:hover:text-white focus-visible:ring-2 focus-visible:ring-mustard rounded p-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-black/70 dark:text-slate-300">
            Apply a new lead status to all <strong>{clients.length}</strong> selected client{clients.length !== 1 ? 's' : ''}.
          </p>

          <div>
            <label htmlFor={selectId} className="block text-sm font-medium text-black dark:text-white mb-1">
              New lead status
            </label>
            <select
              id={selectId}
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus | '')}
              className="w-full border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
              aria-required="true"
            >
              <option value="">— Select a status —</option>
              {LEAD_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div aria-live="polite" aria-atomic="true">
            {subStatusOptions.length > 0 && (
              <div>
                <label htmlFor={subSelectId} className="block text-sm font-medium text-black dark:text-white mb-1">
                  Sub-status <span className="text-black/50 dark:text-slate-400 font-normal">(optional)</span>
                </label>
                <select
                  id={subSelectId}
                  value={selectedSubStatus}
                  onChange={(e) => setSelectedSubStatus(e.target.value)}
                  className="w-full border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
                >
                  <option value="">— None —</option>
                  {subStatusOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && (
            <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={updating}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedStatus || updating}
            aria-busy={updating}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? 'Updating…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
