import { useEffect, useId, useRef, useState } from 'react'
import { clientService } from '@/services'
import type { WelcomeEmailResult } from '@/services'
import { PROJECT_EMAIL_TEMPLATES } from '@/constants/emailTemplates'

interface Props {
  clientPhone: string
  clientName: string
  onClose: () => void
  onDone: (result: WelcomeEmailResult) => void
}

type Step = 'template' | 'confirm'

export function SendEmailModal({ clientPhone, clientName, onClose, onDone }: Props) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  const [step, setStep] = useState<Step>('template')
  const [emailType, setEmailType] = useState<string>(PROJECT_EMAIL_TEMPLATES[0]?.value ?? '')
  const [email, setEmail] = useState('')
  const [fetchingEmail, setFetchingEmail] = useState(false)
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

  const goToConfirm = async () => {
    setFetchingEmail(true)
    setError('')
    try {
      const client = await clientService.get(clientPhone)
      setEmail(client.email ?? '')
    } catch {
      setEmail('')
    } finally {
      setFetchingEmail(false)
    }
    setStep('confirm')
  }

  const handleSend = async () => {
    if (!email.trim()) {
      setError('Please enter an email address.')
      return
    }
    setSending(true)
    setError('')
    try {
      await clientService.patch(clientPhone, { email: email.trim() })
      const result = await clientService.sendWelcomeEmail([clientPhone], emailType as 'welcome' | 'reminder')
      onDone(result)
    } catch {
      setError('Failed to send email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const templateLabel = PROJECT_EMAIL_TEMPLATES.find((t) => t.value === emailType)?.label ?? emailType

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
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <h2 id={titleId} className="text-lg font-semibold text-black dark:text-white">
            Send Email
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
        <div className="px-6 py-5 space-y-5">
          <div className="text-sm text-black/70 dark:text-slate-300">
            To: <span className="font-medium text-black dark:text-white">{clientName}</span>
            <span className="ml-2 text-xs font-mono text-black/40 dark:text-slate-500">{clientPhone}</span>
          </div>

          {step === 'template' ? (
            <fieldset>
              <legend className="text-sm font-medium text-black dark:text-white mb-3">Choose email template</legend>
              {PROJECT_EMAIL_TEMPLATES.length === 0 ? (
                <p className="text-sm text-black/50 dark:text-slate-400 italic">No templates available yet.</p>
              ) : (
                <div className="space-y-2">
                  {PROJECT_EMAIL_TEMPLATES.map((tpl) => (
                    <label
                      key={tpl.value}
                      className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                        border-black/10 dark:border-white/10 hover:bg-black/3 dark:hover:bg-white/5
                        has-[:checked]:border-mustard has-[:checked]:bg-mustard/5"
                    >
                      <input
                        type="radio"
                        name="email-template"
                        value={tpl.value}
                        checked={emailType === tpl.value}
                        onChange={() => setEmailType(tpl.value)}
                        className="accent-mustard"
                      />
                      <span className="text-sm text-black dark:text-white">{tpl.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-black/60 dark:text-slate-400">
                Template: <span className="font-medium text-black dark:text-white">{templateLabel}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">
                  Email address
                </label>
                {fetchingEmail ? (
                  <div className="text-sm text-black/50 dark:text-slate-400">Loading…</div>
                ) : (
                  <>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                      aria-label={`Email address for ${clientName}`}
                      aria-invalid={!email.trim()}
                      className={`w-full text-sm border rounded px-3 py-2 bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard ${
                        !email.trim()
                          ? 'border-amber-400 dark:border-amber-500'
                          : 'border-black/20 dark:border-white/20'
                      }`}
                    />
                    {!email.trim() && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Email address required to send
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-black/10 dark:border-white/10">
          {step === 'confirm' && (
            <button
              type="button"
              onClick={() => { setStep('template'); setError('') }}
              disabled={sending}
              className="btn-secondary text-sm"
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
          {step === 'template' ? (
            <button
              type="button"
              onClick={goToConfirm}
              disabled={PROJECT_EMAIL_TEMPLATES.length === 0}
              className="btn-primary text-sm disabled:opacity-40"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || fetchingEmail}
              aria-busy={sending}
              className="btn-primary text-sm"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
