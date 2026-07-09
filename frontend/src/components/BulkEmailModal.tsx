import { useEffect, useId, useRef, useState } from 'react'
import { clientService } from '@/services'
import type { Client } from '@/types'
import type { WelcomeEmailResult } from '@/services'
import { EMAIL_TEMPLATES, type EmailTemplateKey } from '@/constants/emailTemplates'

interface Row {
  phone_no: string
  name: string
  existingEmail: string
  draftEmail: string
}

interface Props {
  clients: Client[]
  onClose: () => void
  onDone: (result: WelcomeEmailResult) => void
}

export function BulkEmailModal({ clients, onClose, onDone }: Props) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  const [emailType, setEmailType] = useState<EmailTemplateKey>('welcome')
  const [rows, setRows] = useState<Row[]>(() =>
    clients.map((c) => ({
      phone_no: c.phone_no,
      name: c.name,
      existingEmail: c.email ?? '',
      draftEmail: c.email ?? '',
    }))
  )
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

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

  const updateEmail = (phone_no: string, val: string) => {
    setRows((prev) => prev.map((r) => r.phone_no === phone_no ? { ...r, draftEmail: val } : r))
  }

  const handleConfirm = async () => {
    setSending(true)
    setError('')
    try {
      // Step 1: save newly entered emails to client profiles
      const toSave = rows.filter((r) => r.draftEmail.trim() && r.draftEmail.trim() !== r.existingEmail)
      await Promise.allSettled(
        toSave.map((r) => clientService.patch(r.phone_no, { email: r.draftEmail.trim() }))
      )

      // Step 2: send welcome email to all rows that now have an email
      const phoneNosWithEmail = rows
        .filter((r) => r.draftEmail.trim())
        .map((r) => r.phone_no)

      if (phoneNosWithEmail.length === 0) {
        setError('No email addresses provided. Please fill in at least one email.')
        setSending(false)
        return
      }

      const result = await clientService.sendWelcomeEmail(phoneNosWithEmail, emailType)
      onDone(result)
    } catch {
      setError('Failed to send emails. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const missingCount = rows.filter((r) => !r.draftEmail.trim()).length

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
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
          <h2 id={titleId} className="text-lg font-semibold text-black dark:text-white">
            {emailType === 'welcome' ? 'Send Welcome Email' : 'Send Reminder Email'}
          </h2>
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            aria-label="Close send email dialog"
            className="text-black/50 dark:text-slate-400 hover:text-black dark:hover:text-white focus-visible:ring-2 focus-visible:ring-mustard rounded p-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Email type choice */}
          <fieldset className="mb-4">
            <legend className="text-sm font-medium text-black dark:text-white mb-2">Email type</legend>
            <div className="flex gap-6">
              {EMAIL_TEMPLATES.map((tpl) => (
                <label key={tpl.value} className="flex items-center gap-2 cursor-pointer text-sm text-black dark:text-white">
                  <input
                    type="radio"
                    name="email-type"
                    value={tpl.value}
                    checked={emailType === tpl.value}
                    onChange={() => setEmailType(tpl.value)}
                    className="accent-mustard"
                  />
                  {tpl.label}
                </label>
              ))}
            </div>
          </fieldset>

          <p className="text-sm text-black/70 dark:text-slate-300 mb-1">
            Review and confirm email addresses for the <strong>{rows.length}</strong> selected client{rows.length !== 1 ? 's' : ''}.
          </p>
          {missingCount > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-4" role="status" aria-live="polite">
              <span aria-hidden="true">⚠ </span>
              {missingCount} client{missingCount !== 1 ? 's have' : ' has'} no email — please fill in before sending.
            </p>
          )}

          <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 text-left">
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300">Client</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300">Email address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {rows.map((r) => (
                  <tr key={r.phone_no}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-black dark:text-white">{r.name}</div>
                      <div className="text-xs text-black/50 dark:text-slate-400 font-mono">{r.phone_no}</div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="email"
                        value={r.draftEmail}
                        onChange={(e) => updateEmail(r.phone_no, e.target.value)}
                        placeholder="Enter email address"
                        aria-label={`Email address for ${r.name}`}
                        aria-invalid={!r.draftEmail.trim()}
                        aria-describedby={!r.draftEmail.trim() ? `email-required-${r.phone_no}` : undefined}
                        className={`w-full text-sm border rounded px-2 py-1 bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard ${
                          !r.draftEmail.trim()
                            ? 'border-amber-400 dark:border-amber-500'
                            : 'border-black/20 dark:border-white/20'
                        }`}
                      />
                      {!r.draftEmail.trim() && (
                        <span id={`email-required-${r.phone_no}`} className="text-xs text-amber-600 dark:text-amber-400">
                          Required to send email
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && (
            <div role="alert" className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-black/10 dark:border-white/10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={sending}
            aria-busy={sending}
            className="btn-primary text-sm"
          >
            {sending ? 'Sending…' : `Send to ${rows.filter((r) => r.draftEmail.trim()).length}`}
          </button>
        </div>
      </div>
    </div>
  )
}
