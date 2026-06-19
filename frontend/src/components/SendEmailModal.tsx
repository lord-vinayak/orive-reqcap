import { useState, useEffect } from 'react'
import { proposalService, proposalDocService } from '@/services'
import type { Proposal, ProposalDocument } from '@/types'

interface Props {
  requirementId: string
  proposals: Proposal[]
  clientEmail: string
  clientName: string
  /** Pre-select a specific proposal id (optional). */
  defaultProposalId?: string
  onClose: () => void
  onSent: () => void
}

export default function SendEmailModal({
  requirementId,
  proposals,
  clientEmail,
  clientName,
  defaultProposalId,
  onClose,
  onSent,
}: Props) {
  const [selectedProposalId, setSelectedProposalId] = useState(
    defaultProposalId ?? proposals[0]?.id ?? ''
  )
  const [toEmail, setToEmail] = useState(clientEmail)
  const [saveEmail, setSaveEmail] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  // Proposal documents for attachment selection
  const [proposalDocs, setProposalDocs] = useState<ProposalDocument[]>([])
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())

  // If the email field starts empty, default the checkbox to true (save to client)
  useEffect(() => {
    if (!clientEmail) setSaveEmail(true)
  }, [clientEmail])

  // Fetch proposal documents
  useEffect(() => {
    if (!requirementId) return
    proposalDocService.list(requirementId).then(setProposalDocs).catch(() => {/* non-critical */})
  }, [requirementId])

  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSend = async () => {
    setError('')
    if (!selectedProposalId) {
      setError('Please select a Client Costing to send.')
      return
    }
    const emailTrimmed = toEmail.trim()
    if (!emailTrimmed) {
      setError('Please enter a recipient email address.')
      return
    }
    setSending(true)
    try {
      await proposalService.sendEmail(selectedProposalId, {
        to_email: emailTrimmed,
        save_email: saveEmail,
        proposal_doc_ids: [...selectedDocIds],
      })
      onSent()
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Failed to send email. Please check your connection and try again.'
      setError(msg)
    } finally {
      setSending(false)
    }
  }

  // Proposal label helper — "Client Costing #N" numbered oldest-first
  const proposalLabel = (p: Proposal, idx: number) => {
    const num = proposals.length - idx
    const date = new Date(p.created_at).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
    return `Client Costing #${num} — ${date}${p.items.length ? ` (${p.items.length} items)` : ''}`
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-email-modal-title"
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 id="send-email-modal-title" className="text-lg font-semibold dark:text-slate-100">
            Send Client Costing
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-black/40 hover:text-black dark:text-slate-300 dark:hover:text-slate-100 text-xl leading-none focus-visible:ring-2 focus-visible:ring-mustard focus-visible:ring-offset-1 rounded"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Proposal selector */}
          <div>
            <label htmlFor="email-modal-proposal" className="block text-xs font-medium text-black/60 dark:text-slate-300 mb-1">
              Which Client Costing to send?
            </label>
            <select
              id="email-modal-proposal"
              className="w-full"
              value={selectedProposalId}
              onChange={(e) => setSelectedProposalId(e.target.value)}
              disabled={sending}
            >
              {proposals.map((p, idx) => (
                <option key={p.id} value={p.id}>
                  {proposalLabel(p, idx)}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient email */}
          <div>
            <label htmlFor="email-modal-to" className="block text-xs font-medium text-black/60 dark:text-slate-300 mb-1">
              Recipient email {!clientEmail && <span className="text-red-500">*</span>}
            </label>
            <input
              id="email-modal-to"
              type="email"
              className="w-full"
              placeholder="client@example.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              disabled={sending}
              autoFocus={!clientEmail}
            />
            {!clientEmail && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                No email on file for {clientName}.
              </p>
            )}
          </div>

          {/* Save email checkbox — shown when client had no email */}
          {!clientEmail && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveEmail}
                onChange={(e) => setSaveEmail(e.target.checked)}
                disabled={sending}
                className="w-4 h-4 accent-mustard"
              />
              <span className="text-black/70 dark:text-slate-300">
                Save this email to {clientName}'s profile
              </span>
            </label>
          )}

          {/* Subject (read-only preview) */}
          <div>
            <p className="block text-xs font-medium text-black/60 dark:text-slate-300 mb-1">
              Subject
            </p>
            <p className="text-sm text-black/70 dark:text-slate-300 bg-black/[0.03] dark:bg-white/5 rounded px-3 py-2">
              Product Proposal, Cost & Next Steps for Sample Development
            </p>
          </div>

          {/* Proposal document attachment picker */}
          <div>
            <label className="block text-xs font-medium text-black/60 dark:text-slate-300 mb-1">
              Attach Proposal Document(s)
            </label>
            {proposalDocs.length === 0 ? (
              <p className="text-xs text-black/50 dark:text-slate-300 italic">
                No proposal documents uploaded yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {proposalDocs.map((doc) => (
                  <li key={doc.id}>
                    <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={selectedDocIds.has(doc.id)}
                        onChange={() => toggleDoc(doc.id)}
                        disabled={sending}
                        className="w-4 h-4 accent-mustard flex-shrink-0"
                      />
                      <span className="text-xs text-black/70 dark:text-slate-300 truncate" title={doc.filename}>
                        {doc.filename}
                      </span>
                      <span className="text-xs text-black/40 dark:text-slate-300 whitespace-nowrap ml-auto">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Attachment note */}
          <p className="text-xs text-black/70 dark:text-slate-300">
            📎 The Client Costing XLSX is always attached automatically.
          </p>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          {sending ? 'Sending email…' : ''}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} disabled={sending} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleSend} disabled={sending || !toEmail.trim()} className="btn-primary">
            {sending ? 'Sending…' : '✉ Send Email'}
          </button>
        </div>
      </div>
    </div>
  )
}
