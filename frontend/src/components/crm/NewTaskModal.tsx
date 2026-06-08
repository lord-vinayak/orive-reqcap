import { useEffect, useState } from 'react'
import { crmApi } from '@/services/crm'
import type { TaskItem, TaskPriority, InternalTeamMember, CRMProjectList } from '@/types/crm'

interface Props {
  onClose: () => void
  onCreated: (task: TaskItem) => void
}

export default function NewTaskModal({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [plannedDate, setPlannedDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [projectId, setProjectId] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [members, setMembers] = useState<InternalTeamMember[]>([])
  const [projects, setProjects] = useState<CRMProjectList[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    crmApi.allTeamMembers().then((r) => {
      setMembers(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])
    })
    crmApi.listProjects().then((r) => {
      setProjects(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])
    })
  }, [])

  // When a project is selected, auto-fill client phone from that project
  const handleProjectChange = (pid: string) => {
    setProjectId(pid)
    if (pid) {
      const proj = projects.find((p) => p.id === pid)
      if (proj) setClientPhone(proj.client)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required.'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await crmApi.createStandaloneTask({
        title: title.trim(),
        priority,
        planned_closure_date: plannedDate || null,
        assigned_to: assignedTo || null,
        project: projectId || null,
        client: clientPhone || null,
      })
      onCreated(res.data)
      onClose()
    } catch {
      setError('Failed to create task. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="New task">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-black dark:text-white">New Task</h2>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-black/60 dark:text-slate-400 mb-1">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Describe the task…"
            autoFocus
            className="w-full text-sm border border-black/20 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-black dark:text-white placeholder-black/30 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-mustard"
          />
        </div>

        {/* Priority + Planned date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-black/60 dark:text-slate-400 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full text-sm border border-black/20 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-black/60 dark:text-slate-400 mb-1">Planned Closure Date</label>
            <input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="w-full text-sm border border-black/20 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
            />
          </div>
        </div>

        {/* Assign to */}
        <div>
          <label className="block text-xs font-semibold text-black/60 dark:text-slate-400 mb-1">Assign To</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full text-sm border border-black/20 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
          >
            <option value="">— Unassigned —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.team})</option>
            ))}
          </select>
        </div>

        {/* Link to project (optional) */}
        <div>
          <label className="block text-xs font-semibold text-black/60 dark:text-slate-400 mb-1">
            Link to Project <span className="text-black/30 dark:text-slate-600 font-normal">(optional)</span>
          </label>
          <select
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full text-sm border border-black/20 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
          >
            <option value="">— None —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_no} — {p.client_name}</option>
            ))}
          </select>
        </div>

        {/* Client phone (auto-filled or manual) */}
        {!projectId && (
          <div>
            <label className="block text-xs font-semibold text-black/60 dark:text-slate-400 mb-1">
              Client Phone <span className="text-black/30 dark:text-slate-600 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="10-digit phone number"
              maxLength={10}
              className="w-full text-sm border border-black/20 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-black dark:text-white placeholder-black/30 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-mustard"
            />
          </div>
        )}

        {error && <p className="text-xs text-red-500" role="alert">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-black/20 dark:border-white/20 rounded-xl text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 text-sm bg-mustard text-white font-medium rounded-xl disabled:opacity-40"
          >
            {submitting ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
