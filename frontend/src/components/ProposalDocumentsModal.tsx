import { useEffect, useRef, useState } from 'react'
import { proposalDocService } from '@/services'
import type { ProposalDocument } from '@/types'

interface Props {
  requirementId: string
  onClose: () => void
  /** Called after any upload so parent can refresh its doc count. */
  onUploaded: (doc: ProposalDocument) => void
}

export default function ProposalDocumentsModal({ requirementId, onClose, onUploaded }: Props) {
  const [docs, setDocs] = useState<ProposalDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      setDocs(await proposalDocService.list(requirementId))
    } catch {
      setError('Failed to load proposal documents.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [requirementId])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const doc = await proposalDocService.upload(requirementId, file)
      setDocs((prev) => [doc, ...prev])
      onUploaded(doc)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Upload failed. Please try again.'
      setError(msg)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const ext = (filename: string) => {
    const e = filename.split('.').pop()?.toLowerCase()
    return e === 'pdf' ? '📄' : e === 'doc' || e === 'docx' ? '📝' : '📁'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-900/40 dark:bg-slate-950/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-docs-modal-title"
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 id="proposal-docs-modal-title" className="text-lg font-semibold dark:text-slate-100">
            Proposal Documents
          </h2>
          <button
            onClick={onClose}
            className="text-black/40 hover:text-black dark:text-slate-500 dark:hover:text-slate-200 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-black/60 dark:text-slate-400">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-slate-400">No proposal documents uploaded yet.</p>
        ) : (
          <ul className="space-y-2 mb-4 max-h-72 overflow-y-auto">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-3 border border-black/8 dark:border-white/8 rounded p-3"
              >
                <span className="text-xl" aria-hidden="true">{ext(doc.filename)}</span>
                <div className="min-w-0 flex-1">
                  <a
                    href={doc.drive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium truncate block hover:underline text-mustard-700 dark:text-mustard-400"
                  >
                    {doc.filename}
                  </a>
                  <p className="text-xs text-black/50 dark:text-slate-500 mt-0.5">
                    {doc.uploaded_by_name ?? '—'} · {new Date(doc.uploaded_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
        )}

        <div className="flex justify-between items-center border-t border-black/10 dark:border-white/10 pt-4 mt-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary text-sm"
          >
            {uploading ? 'Uploading…' : '+ Upload Another'}
          </button>
          <button onClick={onClose} className="btn-secondary text-sm">
            Close
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}
