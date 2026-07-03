import { useEffect, useId, useRef, useState } from 'react'
import { clientService } from '@/services'
import type { WelcomeEmailResult } from '@/services'
import { PROJECT_EMAIL_TEMPLATES, TEMPLATE_FIELDS, type TemplateField } from '@/constants/emailTemplates'
import { crmApi } from '@/services/crm'
import type { Invoice } from '@/types/crm'

interface Props {
  clientPhone: string
  clientName: string
  projectId: string
  onClose: () => void
  onDone: (result: WelcomeEmailResult) => void
}

type Step = 'template' | 'confirm'

export function SendEmailModal({ clientPhone, clientName, projectId, onClose, onDone }: Props) {
  const titleId = useId()
  const fileInputId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)
  const fieldsRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<Element | null>(null)
  const confirmEmailRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('template')
  const [emailType, setEmailType] = useState<string>(PROJECT_EMAIL_TEMPLATES[0]?.value ?? '')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [fetchingEmail, setFetchingEmail] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [projectInvoices, setProjectInvoices] = useState<Invoice[]>([])
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([])

  // Capture trigger, focus dialog, restore on unmount
  useEffect(() => {
    previousFocus.current = document.activeElement
    firstFocusableRef.current?.focus()
    return () => { (previousFocus.current as HTMLElement)?.focus?.() }
  }, [])

  // Focus first confirm-step field when step changes
  useEffect(() => {
    if (step === 'confirm') confirmEmailRef.current?.focus()
  }, [step])

  // Focus trap + Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const el = dialogRef.current
        if (!el || !el.contains(document.activeElement)) return
        const focusable = el.querySelectorAll<HTMLElement>(
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

  // Fetch project invoices for attachment selection
  useEffect(() => {
    if (!projectId) return
    crmApi.listInvoices({ project: projectId })
      .then((r) => setProjectInvoices(r.data.results))
      .catch(() => {})
  }, [projectId])

  const activeFields: TemplateField[] = TEMPLATE_FIELDS[emailType] ?? []

  useEffect(() => {
    if (activeFields.length > 0) {
      fieldsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [emailType])

  const goToConfirm = async () => {
    // Validate required template fields
    const missing = activeFields.filter((f) => !fieldValues[f.key]?.trim())
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map((f) => f.label).join(', ')}`)
      return
    }
    setError('')
    setFetchingEmail(true)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    setFiles((prev) => [...prev, ...picked])
    e.target.value = ''
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSend = async () => {
    setEmailTouched(true)
    if (!email.trim()) {
      setError('Please enter an email address.')
      return
    }
    setSending(true)
    setError('')
    try {
      await clientService.patch(clientPhone, { email: email.trim() })
      const result = await clientService.sendProjectEmail(clientPhone, emailType, projectId, files, fieldValues, selectedInvoiceIds)
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
            type="button"
            onClick={onClose}
            aria-label="Close send email dialog"
            className="text-black/50 dark:text-slate-400 hover:text-black dark:hover:text-white focus-visible:ring-2 focus-visible:ring-mustard rounded p-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
          <div className="text-sm text-black/70 dark:text-slate-300">
            To: <span className="font-medium text-black dark:text-white">{clientName}</span>
            <span className="ml-2 text-xs font-mono text-black/60 dark:text-slate-400">{clientPhone}</span>
          </div>

          {step === 'template' ? (
            <div className="space-y-5">
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
                          onChange={() => { setEmailType(tpl.value); setFieldValues({}) }}
                          className="accent-mustard"
                        />
                        <span className="text-sm text-black dark:text-white">{tpl.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>

              {/* Dynamic fields for the selected template */}
              {activeFields.length > 0 && (
                <div ref={fieldsRef} className="space-y-3 pt-1 border-t border-black/10 dark:border-white/10">
                  <p className="text-sm font-medium text-black dark:text-white">Email details</p>
                  {activeFields.map((field) => (
                    <div key={field.key}>
                      <label
                        htmlFor={`template-field-${field.key}`}
                        className="block text-xs font-medium text-black/70 dark:text-slate-300 mb-1"
                      >
                        {field.label}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          id={`template-field-${field.key}`}
                          value={fieldValues[field.key] ?? ''}
                          onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          required
                          aria-required="true"
                          className="w-full text-sm border border-black/20 dark:border-white/20 rounded px-3 py-2 bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
                        >
                          <option value="">Select…</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`template-field-${field.key}`}
                          type={field.type}
                          value={fieldValues[field.key] ?? ''}
                          onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          required
                          aria-required="true"
                          className="w-full text-sm border border-black/20 dark:border-white/20 rounded px-3 py-2 bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-black/60 dark:text-slate-400">
                Template: <span className="font-medium text-black dark:text-white">{templateLabel}</span>
              </div>

              {/* Email address */}
              <div>
                <label htmlFor="confirm-email-input" className="block text-sm font-medium text-black dark:text-white mb-1">
                  Email address
                </label>
                {fetchingEmail ? (
                  <div role="status" aria-live="polite" className="text-sm text-black/50 dark:text-slate-400">Loading…</div>
                ) : (
                  <>
                    <input
                      id="confirm-email-input"
                      ref={confirmEmailRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                      aria-invalid={emailTouched && !email.trim()}
                      className={`w-full text-sm border rounded px-3 py-2 bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard ${
                        emailTouched && !email.trim()
                          ? 'border-amber-400 dark:border-amber-500'
                          : 'border-black/20 dark:border-white/20'
                      }`}
                    />
                    {!email.trim() && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Required</p>
                    )}
                  </>
                )}
              </div>

              {/* Invoice attachment picker */}
              {projectInvoices.length > 0 && (
                <div>
                  <p className="block text-sm font-medium text-black dark:text-white mb-1">
                    Attach Invoices <span className="font-normal text-black/60 dark:text-slate-400">(optional)</span>
                  </p>
                  <div className="space-y-1">
                    {projectInvoices.map((inv) => (
                      <label key={inv.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedInvoiceIds.includes(inv.id)}
                          onChange={(e) => {
                            setSelectedInvoiceIds((prev) =>
                              e.target.checked ? [...prev, inv.id] : prev.filter((id) => id !== inv.id)
                            )
                          }}
                          className="rounded accent-mustard"
                        />
                        <span className="text-black dark:text-white font-mono text-xs">{inv.invoice_number}</span>
                        <span className="text-black/50 dark:text-slate-400 text-xs">{inv.invoice_type_label} · {new Date(inv.date).toLocaleDateString('en-IN')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* File attachments */}
              <div>
                <label htmlFor={fileInputId} className="block text-sm font-medium text-black dark:text-white mb-1">
                  Attachments <span className="font-normal text-black/60 dark:text-slate-400">(optional — saved to Google Drive)</span>
                </label>
                <label
                  htmlFor={fileInputId}
                  className="flex items-center gap-2 text-sm px-3 py-2 border border-dashed border-black/20 dark:border-white/20 rounded cursor-pointer hover:border-mustard hover:text-mustard transition-colors text-black/60 dark:text-slate-400"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                  </svg>
                  Add files
                </label>
                <input
                  id={fileInputId}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="sr-only"
                  aria-label="Attach files to email"
                />
                {files.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center justify-between text-xs bg-black/5 dark:bg-white/5 rounded px-2 py-1">
                        <span className="truncate text-black dark:text-white">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          aria-label={`Remove ${f.name}`}
                          className="ml-2 shrink-0 text-black/40 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
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

        <div role="status" aria-live="polite" className="sr-only">{sending ? 'Sending email…' : ''}</div>
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
