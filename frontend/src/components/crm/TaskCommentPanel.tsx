import { useEffect, useRef, useState } from 'react'
import { crmApi } from '@/services/crm'
import { useAuthStore } from '@/store/authStore'
import type { TaskComment, TaskItem } from '@/types/crm'

interface Props {
  task: TaskItem
  onClose: () => void
  onCommentAdded: (task: TaskItem) => void
}

export default function TaskCommentPanel({ task, onClose, onCommentAdded }: Props) {
  const user = useAuthStore((s) => s.user)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const params = task.task_type === 'stage'
    ? { stage_task: task.id }
    : { standalone_task: task.id }

  useEffect(() => {
    setLoading(true)
    crmApi.listTaskComments(params)
      .then((r) => {
        const items = Array.isArray(r.data) ? r.data : (r.data as any).results ?? []
        setComments(items)
      })
      .finally(() => setLoading(false))
  }, [task.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const handleAdd = async () => {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      const payload = { text: text.trim(), ...params }
      const res = await crmApi.addTaskComment(payload)
      setComments((prev) => [...prev, res.data])
      setText('')
      // Bubble up so the tracker row updates latest_comment
      const updated: TaskItem = {
        ...task,
        latest_comment: {
          id: res.data.id,
          text: res.data.text,
          author_name: res.data.author_name,
          created_at: res.data.created_at,
          edited: false,
        },
        last_updated_at: res.data.created_at,
        last_updated_by_name: res.data.author_name,
      }
      onCommentAdded(updated)
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (c: TaskComment) => {
    setEditingId(c.id)
    setEditText(c.text)
  }

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return
    const res = await crmApi.editTaskComment(id, editText.trim())
    setComments((prev) => prev.map((c) => (c.id === id ? res.data : c)))
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this comment?')) return
    await crmApi.deleteTaskComment(id)
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Task comments">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/10 dark:border-white/10 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-black/40 dark:text-slate-500 mb-0.5">Comments</p>
            <h2 className="font-semibold text-black dark:text-white text-sm leading-snug line-clamp-2">
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-black/40 dark:text-slate-500 hover:text-black dark:hover:text-white p-1 rounded"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <p className="text-sm text-black/40 dark:text-slate-500">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-black/40 dark:text-slate-500 text-center py-8">No comments yet.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="group space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-black dark:text-white">
                    {c.author_name ?? c.author_email ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-black/40 dark:text-slate-500">{fmtTime(c.created_at)}</span>
                  {c.edited && <span className="text-xs text-black/30 dark:text-slate-600 italic">(edited)</span>}
                </div>

                {editingId === c.id ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full text-sm border border-black/20 dark:border-white/20 rounded p-2 bg-white dark:bg-slate-800 text-black dark:text-white resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(c.id)}
                        className="text-xs px-3 py-1 bg-mustard text-white rounded"
                      >Save</button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs px-3 py-1 text-black/50 dark:text-slate-400 hover:text-black dark:hover:text-white"
                      >Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-black dark:text-white whitespace-pre-wrap">{c.text}</p>
                )}

                {editingId !== c.id && (
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {c.author === user?.id && (
                      <button
                        onClick={() => startEdit(c)}
                        className="text-xs text-black/40 dark:text-slate-500 hover:text-black dark:hover:text-white"
                      >Edit</button>
                    )}
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >Delete</button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-black/10 dark:border-white/10 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd() }}
            placeholder="Add a comment… (Ctrl+Enter to send)"
            rows={3}
            className="w-full text-sm border border-black/20 dark:border-white/20 rounded-lg p-3 bg-white dark:bg-slate-800 text-black dark:text-white placeholder-black/30 dark:placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-mustard"
          />
          <button
            onClick={handleAdd}
            disabled={!text.trim() || submitting}
            className="w-full py-2 bg-mustard text-white text-sm font-medium rounded-lg disabled:opacity-40"
          >
            {submitting ? 'Sending…' : 'Add Comment'}
          </button>
        </div>
      </div>
    </div>
  )
}
