import { useEffect, useId, useRef, useState } from 'react'
import { clientService } from '@/services'

interface Props {
  clientPhone: string
  clientName: string
  clientEmail: string
  onClose: () => void
  onSent: () => void
}

const TOOLBAR: { cmd: string; label: string; icon: string; value?: string }[] = [
  { cmd: 'bold', label: 'Bold', icon: 'B' },
  { cmd: 'italic', label: 'Italic', icon: 'I' },
  { cmd: 'underline', label: 'Underline', icon: 'U' },
  { cmd: 'insertUnorderedList', label: 'Bulleted list', icon: '• List' },
  { cmd: 'insertOrderedList', label: 'Numbered list', icon: '1. List' },
]

/** Gmail-style compose modal: free subject + rich-text body + attachments — no template. */
export default function ComposeEmailModal({ clientPhone, clientName, clientEmail, onClose, onSent }: Props) {
  const titleId = useId()
  const bodyLabelId = useId()
  const bodyFieldId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<Element | null>(null)

  const [subject, setSubject] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    previousFocus.current = document.activeElement
    firstFocusableRef.current?.focus()
    return () => { (previousFocus.current as HTMLElement)?.focus?.() }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const exec = (cmd: string) => {
    bodyRef.current?.focus()
    document.execCommand(cmd)
  }

  const insertLink = () => {
    const url = window.prompt('Link URL')
    if (!url) return
    bodyRef.current?.focus()
    document.execCommand('createLink', false, url)
  }

  const addFiles = (list: FileList | null) => {
    if (!list) return
    setFiles((prev) => [...prev, ...Array.from(list)])
  }

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  const handleSend = async () => {
    setSubmitted(true)
    setError('')
    const html = (bodyRef.current?.innerHTML ?? '').trim()
    if (!subject.trim()) { setError('Please enter a subject.'); return }
    if (!html) { setError('Please write a message.'); return }
    setSending(true)
    try {
      const result = await clientService.sendCustomEmail(clientPhone, subject.trim(), html, files)
      if (result.sent.length === 0) {
        setError(result.skipped[0]?.reason || 'Failed to send email.')
        return
      }
      setSent(true)
      onSent()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Failed to send email. Please check your connection and try again.'
      setError(msg)
    } finally {
      setSending(false)
    }
  }

  if (!clientEmail) {
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
          className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6"
        >
          <h2 id={titleId} className="text-lg font-semibold text-black dark:text-white mb-2">No email on file</h2>
          <p className="text-sm text-black/70 dark:text-slate-300 mb-4">
            {clientName} has no email address saved. Add one in Client Details before sending.
          </p>
          <div className="flex justify-end">
            <button ref={firstFocusableRef} type="button" onClick={onClose} className="btn-secondary text-sm">Close</button>
          </div>
        </div>
      </div>
    )
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
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
          <h2 id={titleId} className="text-lg font-semibold text-black dark:text-white">
            New Message to {clientName}
          </h2>
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            aria-label="Close compose email dialog"
            className="text-black/50 dark:text-slate-400 hover:text-black dark:hover:text-white focus-visible:ring-2 focus-visible:ring-mustard rounded p-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
          {sent ? (
            <p role="status" className="text-sm text-green-700 dark:text-green-400 py-6 text-center">
              ✓ Email sent to {clientEmail}.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm border-b border-black/10 dark:border-white/10 pb-2">
                <span className="text-black/50 dark:text-slate-400">To</span>
                <span className="text-black dark:text-white">{clientEmail}</span>
              </div>

              <div className="border-b border-black/10 dark:border-white/10 pb-2">
                <label htmlFor="compose-subject" className="sr-only">Subject</label>
                <input
                  id="compose-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full text-sm bg-transparent focus:outline-none text-black dark:text-white"
                  aria-invalid={submitted && !subject.trim()}
                  disabled={sending}
                />
              </div>

              {/* Toolbar */}
              <div role="toolbar" aria-label="Formatting" aria-controls={bodyFieldId} className="flex flex-wrap gap-1">
                {TOOLBAR.map((t) => (
                  <button
                    key={t.cmd}
                    type="button"
                    onClick={() => exec(t.cmd)}
                    aria-label={t.label}
                    title={t.label}
                    className="text-xs px-2 py-1 rounded border border-black/15 dark:border-white/15 hover:bg-mustard/10 text-black dark:text-white"
                    disabled={sending}
                  >
                    {t.icon}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={insertLink}
                  aria-label="Insert link"
                  title="Insert link"
                  className="text-xs px-2 py-1 rounded border border-black/15 dark:border-white/15 hover:bg-mustard/10 text-black dark:text-white"
                  disabled={sending}
                >
                  🔗 Link
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach files"
                  title="Attach files"
                  className="text-xs px-2 py-1 rounded border border-black/15 dark:border-white/15 hover:bg-mustard/10 text-black dark:text-white ml-auto"
                  disabled={sending}
                >
                  📎 Attach
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
                />
              </div>

              {/* Rich text body */}
              <p id={bodyLabelId} className="sr-only">Message body</p>
              <div
                id={bodyFieldId}
                ref={bodyRef}
                contentEditable
                role="textbox"
                aria-multiline="true"
                aria-labelledby={bodyLabelId}
                aria-invalid={submitted && !(bodyRef.current?.innerHTML ?? '').trim()}
                className="min-h-[200px] border border-black/15 dark:border-white/15 rounded px-3 py-2 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard overflow-y-auto"
                suppressContentEditableWarning
              />

              {/* Attachment chips */}
              {files.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label="Attached files">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-1 text-xs bg-black/5 dark:bg-white/10 rounded-full pl-2 pr-1 py-1">
                      <span className="max-w-[160px] truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        aria-label={`Remove attachment ${f.name}`}
                        className="text-black/50 dark:text-slate-400 hover:text-black dark:hover:text-white leading-none px-1"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {error && (
                <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-black/10 dark:border-white/10 shrink-0">
          <button type="button" onClick={onClose} disabled={sending} className="btn-secondary text-sm">
            {sent ? 'Close' : 'Cancel'}
          </button>
          {!sent && (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
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
