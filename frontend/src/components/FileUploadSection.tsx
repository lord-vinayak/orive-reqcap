import { useEffect, useRef, useState } from 'react'
import { fileService } from '@/services'
import { useAuthStore } from '@/store/authStore'
import type { FileRecord } from '@/types'

interface Props {
  requirementId: string
}

export default function FileUploadSection({ requirementId }: Props) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin')

  const load = async () => setFiles(await fileService.list(requirementId))
  useEffect(() => { load() }, [requirementId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      await fileService.upload(requirementId, file)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this file?')) return
    await fileService.delete(id)
    await load()
  }

  return (
    <section className="card" aria-labelledby="files-heading">
      <h2 id="files-heading" className="text-lg font-semibold mb-3">Files</h2>
      <p className="text-xs text-black/50 mb-3">Upload images, videos, or documents the client has shared.</p>

      <div className="flex items-center gap-2 mb-4">
        <input
          ref={inputRef}
          type="file"
          onChange={handleUpload}
          className="text-sm"
          disabled={uploading}
          aria-label="Choose file to upload"
        />
        {uploading && <span className="text-sm text-black/60">Uploading to Google Drive…</span>}
      </div>
      {error && <p role="alert" className="text-sm text-red-700 mb-3">{error}</p>}

      {files.length === 0 ? (
        <p className="text-sm text-black/50">No files yet.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between text-sm">
              <a href={f.drive_url} target="_blank" rel="noreferrer" className="text-mustard-700 hover:underline">
                {f.filename}
              </a>
              <div className="flex items-center gap-3 text-xs text-black/50">
                <span>{f.file_type}</span>
                <span>{new Date(f.uploaded_at).toLocaleDateString()}</span>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="text-red-700 hover:underline"
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
