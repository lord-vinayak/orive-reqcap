import { useId, useState } from 'react'

interface DocFile {
  id: string
  filename: string
  drive_url: string
}

// Generic per-row "Documents" cell: expand to list/attach/delete files against any parent record.
export default function DocumentsCell<T extends DocFile>({
  entityId, isAdmin, listFiles, uploadFile, deleteFile,
}: {
  entityId: string
  isAdmin: boolean
  listFiles: (id: string) => Promise<T[]>
  uploadFile: (id: string, file: File) => Promise<T>
  deleteFile: (id: string, fileId: string) => Promise<unknown>
}) {
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<T[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // ponytail: fetched lazily on expand, not on row mount — avoids one request per row on page load
  const load = () => { listFiles(entityId).then(setFiles) }

  const handleToggle = () => {
    setOpen((o) => !o)
    if (files === null) load()
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try {
      await uploadFile(entityId, file)
      load()
    } catch {
      setError('Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return
    await deleteFile(entityId, fileId)
    setFiles((prev) => (prev ?? []).filter((f) => f.id !== fileId))
  }

  return (
    <div className="min-w-[140px] space-y-1">
      <button type="button" onClick={handleToggle} className="text-xs font-semibold text-mustard-700 hover:underline">
        {open ? 'Hide' : 'Documents'}{files ? ` (${files.length})` : ''}
      </button>
      {open && (
        <div className="space-y-1" aria-live="polite">
          {files && files.length > 0 && (
            <ul className="space-y-0.5">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-1 text-xs">
                  <a href={f.drive_url} target="_blank" rel="noopener noreferrer" className="text-mustard-700 hover:underline truncate max-w-[110px]" title={f.filename}>
                    {f.filename}
                  </a>
                  {isAdmin && (
                    <button type="button" onClick={() => handleDelete(f.id)} className="text-red-600 dark:text-red-400 hover:underline shrink-0" aria-label={`Delete ${f.filename}`}>
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <label htmlFor={inputId} className="text-xs font-semibold text-mustard-700 hover:underline cursor-pointer inline-block">
            {uploading ? 'Uploading…' : '+ Attach'}
          </label>
          <input id={inputId} type="file" className="sr-only" onChange={handleUpload} disabled={uploading} />
          {error && <div role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</div>}
        </div>
      )}
    </div>
  )
}
