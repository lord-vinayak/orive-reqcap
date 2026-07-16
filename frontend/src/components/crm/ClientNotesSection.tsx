import { useEffect, useState } from 'react'
import { clientService } from '@/services'
import { useAuthStore } from '@/store/authStore'
import type { ClientNote } from '@/types'

interface Props {
  clientPhone: string
}

export default function ClientNotesSection({ clientPhone }: Props) {
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin')

  const load = async () => setNotes(await clientService.listNotes(clientPhone))
  useEffect(() => { load().finally(() => setLoading(false)) }, [clientPhone])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setAdding(true)
    setAddError('')
    try {
      await clientService.addNote(clientPhone, text.trim())
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
    try {
      await clientService.deleteNote(id)
      await load()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete note.')
    }
  }

  return (
    <section aria-labelledby="client-notes-heading" className="mt-8 bg-white dark:bg-slate-800 rounded-xl border border-black/10 dark:border-white/10 p-6">
      <h2 id="client-notes-heading" className="text-base font-semibold text-black dark:text-white mb-1">Notes</h2>
      <p className="text-xs text-black/60 dark:text-slate-400 mb-4">
        Standalone notes for this client — not tied to any project or requirement. Notes are append-only.
      </p>

      <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <label htmlFor="new-client-note-input" className="sr-only">Add a note</label>
          <input
            id="new-client-note-input"
            value={text}
            onChange={(e) => { setText(e.target.value); setAddError('') }}
            placeholder="Add a note…"
            className="flex-1 text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
          />
          <button type="submit" disabled={adding || !text.trim()} className="btn-primary text-sm">
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
        {addError && (
          <p role="alert" className="text-xs text-red-700 dark:text-red-400">{addError}</p>
        )}
      </form>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">No notes for this client yet.</p>
      ) : (
        <ol className="space-y-2" aria-label="Note history">
          {notes.map((n) => (
            <li key={n.id} className="border-l-2 border-mustard pl-3 py-1">
              <div className="text-sm text-black dark:text-slate-100">{n.text}</div>
              <div className="text-xs text-black/60 dark:text-slate-300 mt-0.5 flex items-center gap-2">
                <span>{n.added_by_name || 'Unknown'}</span>
                <span>•</span>
                <span>{new Date(n.created_at).toLocaleString('en-IN')}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(n.id)}
                    className="ml-2 text-red-700 dark:text-red-400 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                    aria-label={`Delete note by ${n.added_by_name || 'Unknown'}`}
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
