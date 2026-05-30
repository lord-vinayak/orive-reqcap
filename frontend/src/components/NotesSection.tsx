import { useEffect, useState } from 'react'
import { notesService, AUTO_NOTE_MARKER_RE } from '@/services'
import { useAuthStore } from '@/store/authStore'
import type { Note } from '@/types'

interface Props {
  requirementId: string
  /** Bump to trigger a refetch (used after Save to surface auto-mirror notes). */
  refreshKey?: number
}

export default function NotesSection({ requirementId, refreshKey }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin')

  const load = async () => {
    const data = await notesService.list(requirementId)
    setNotes(data)
  }
  useEffect(() => { load() }, [requirementId, refreshKey])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setAdding(true)
    setAddError('')
    try {
      await notesService.add(requirementId, text.trim())
      setText('')
      await load()
    } catch (err: any) {
      setAddError(err.response?.data?.detail || err.response?.data?.text?.[0] || 'Failed to add note. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note? This cannot be undone.')) return
    await notesService.delete(id)
    await load()
  }

  return (
    <section className="card" aria-labelledby="notes-heading">
      <h2 id="notes-heading" className="text-lg font-semibold mb-3">Notes</h2>
      <p className="text-xs text-black/60 dark:text-slate-400 mb-3">Notes are append-only. Each note records the author and timestamp.</p>

      <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); setAddError('') }}
            placeholder="Add a note…"
            className="flex-1"
            aria-label="New note"
          />
          <button type="submit" disabled={adding || !text.trim()} className="btn-primary">
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
        {addError && (
          <p role="alert" className="text-xs text-red-700">{addError}</p>
        )}
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-slate-400">No notes yet.</p>
      ) : (
        <ol className="space-y-2" aria-label="Note history">
          {notes.map((n) => (
            <li key={n.id} className="border-l-2 border-mustard pl-3 py-1">
              <div className="text-sm text-black dark:text-slate-100">{n.text.replace(AUTO_NOTE_MARKER_RE, '')}</div>
              <div className="text-xs text-black/60 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{n.added_by_name || 'Unknown'}</span>
                <span>•</span>
                <span>{new Date(n.created_at).toLocaleString()}</span>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="ml-2 text-red-700 underline-offset-2 hover:underline"
                    aria-label="Delete note"
                  >
                    delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
