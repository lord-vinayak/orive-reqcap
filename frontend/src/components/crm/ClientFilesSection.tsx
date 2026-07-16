import { useEffect, useRef, useState } from 'react'
import { clientService } from '@/services'
import { useAuthStore } from '@/store/authStore'
import type { ClientFile } from '@/types'

interface Props {
  clientPhone: string
}

export default function ClientFilesSection({ clientPhone }: Props) {
  const [files, setFiles] = useState<ClientFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin')

  const load = async () => setFiles(await clientService.listFiles(clientPhone))
  useEffect(() => { load().finally(() => setLoading(false)) }, [clientPhone])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      await clientService.uploadFile(clientPhone, file)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'File upload failed. Check your internet connection and try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this file from Google Drive? This cannot be undone.')) return
    await clientService.deleteFile(id)
    await load()
  }

  return (
    <section aria-labelledby="client-files-heading" className="mt-8 bg-white dark:bg-slate-800 rounded-xl border border-black/10 dark:border-white/10 p-6">
      <h2 id="client-files-heading" className="text-base font-semibold text-black dark:text-white mb-1">Files</h2>
      <p className="text-xs text-black/60 dark:text-slate-400 mb-4">
        Standalone files for this client — not tied to any project or requirement.
      </p>

      <div className="flex items-center gap-2 mb-4">
        <input
          ref={inputRef}
          type="file"
          onChange={handleUpload}
          className="text-sm"
          disabled={uploading}
          aria-label="Choose file to upload"
        />
        {uploading && <span className="text-sm text-black/60 dark:text-slate-400">Uploading to Google Drive…</span>}
      </div>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400 mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">No files uploaded for this client yet.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between text-sm">
              <a
                href={f.drive_url}
                target="_blank"
                rel="noreferrer"
                className="text-mustard-700 hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                aria-label={`Open file: ${f.filename} (opens in new tab)`}
              >
                {f.filename}
              </a>
              <div className="flex items-center gap-3 text-xs text-black/60 dark:text-slate-300">
                <span>{f.file_type}</span>
                <span>{new Date(f.uploaded_at).toLocaleDateString('en-IN')}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(f.id)}
                    className="text-red-700 dark:text-red-400 hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                    aria-label={`Delete file: ${f.filename}`}
                  >
                    delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
