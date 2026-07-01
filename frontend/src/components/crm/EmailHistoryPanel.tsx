import { useEffect, useRef, useState } from 'react'
import { clientService } from '@/services'
import type { EmailLog } from '@/services'

interface Props {
  clientPhone: string
  clientName: string
  onClose: () => void
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const TYPE_BADGE: Record<string, string> = {
  welcome: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  reminder: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  sample_initiation: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

function typeBadge(emailType: string) {
  return TYPE_BADGE[emailType] ?? 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-slate-300'
}

export function EmailHistoryPanel({ clientPhone, clientName, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    clientService.getEmailHistory(clientPhone)
      .then(setLogs)
      .catch(() => setError('Failed to load email history.'))
      .finally(() => setLoading(false))
  }, [clientPhone])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Email history for ${clientName}`}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-black dark:text-white">Email History</h2>
            <p className="text-xs text-black/50 dark:text-slate-400 mt-0.5">{clientName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close email history"
            className="text-black/50 dark:text-slate-400 hover:text-black dark:hover:text-white focus-visible:ring-2 focus-visible:ring-mustard rounded p-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p role="status" className="text-sm text-black/50 dark:text-slate-400">Loading…</p>
          ) : error ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-black/50 dark:text-slate-400 italic">No emails sent yet.</p>
          ) : (
            <ul className="space-y-4">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="border border-black/10 dark:border-white/10 rounded-lg p-4 space-y-2"
                >
                  {/* Type badge + date */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge(log.email_type)}`}>
                      {log.email_type_label}
                    </span>
                    <span className="text-xs text-black/40 dark:text-slate-500 shrink-0">{fmtDate(log.sent_at)}</span>
                  </div>

                  {/* Subject */}
                  <p className="text-sm font-medium text-black dark:text-white leading-snug">{log.subject}</p>

                  {/* Meta */}
                  <div className="text-xs text-black/50 dark:text-slate-400 space-y-0.5">
                    <div>To: <span className="text-black/70 dark:text-slate-300">{log.recipient_email}</span></div>
                    {log.sent_by_name && (
                      <div>Sent by: <span className="text-black/70 dark:text-slate-300">{log.sent_by_name}</span></div>
                    )}
                    {log.project_no && (
                      <div>Project: <span className="text-black/70 dark:text-slate-300">{log.project_no}</span></div>
                    )}
                  </div>

                  {/* Attachments */}
                  {log.attachments.length > 0 && (
                    <div>
                      <p className="text-xs text-black/50 dark:text-slate-400 mb-1">Attachments:</p>
                      <ul className="space-y-1">
                        {log.attachments.map((att, i) => (
                          <li key={i}>
                            <a
                              href={att.drive_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-mustard hover:underline flex items-center gap-1"
                            >
                              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                              </svg>
                              {att.filename}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
