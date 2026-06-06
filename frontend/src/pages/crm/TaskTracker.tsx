import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { crmApi } from '@/services/crm'
import { useTaskSocket } from '@/hooks/useTaskSocket'
import type { TaskItem, TaskStatus } from '@/types/crm'
import { TASK_STATUS_LABELS } from '@/types/crm'

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'wip', label: 'WIP' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
]

const STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-slate-400',
  wip: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  pending: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  closed: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
}

export default function TaskTracker() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const [liveAnnouncement, setLiveAnnouncement] = useState('')

  // Upsert task row by id
  const upsertTask = useCallback((updated: TaskItem) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === updated.id)
      if (idx === -1) {
        setLiveAnnouncement(`New task assigned: ${updated.stage_display} on ${updated.project_no}`)
        return [updated, ...prev]
      }
      const next = [...prev]
      next[idx] = updated
      setLiveAnnouncement(`Task updated: ${updated.stage_display} is now ${TASK_STATUS_LABELS[updated.task_status]}`)
      return next
    })
  }, [])

  useTaskSocket(upsertTask)

  useEffect(() => {
    crmApi.listTasks()
      .then((r) => {
        const items = Array.isArray(r.data)
          ? r.data
          : (r.data as any).results ?? []
        setTasks(items)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleStatusChange = async (task: TaskItem, newStatus: TaskStatus) => {
    setUpdatingId(task.id)
    try {
      await crmApi.updateTaskStatus(task.project_id, task.stage_key, newStatus)
      // broadcast will update state; also update optimistically
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, task_status: newStatus } : t))
      )
    } catch {
      // ignore — WS will correct state if it went through
    } finally {
      setUpdatingId(null)
    }
  }

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  return (
    <Layout title="Task Tracker">
      <div className="space-y-6">
        {/* Screen-reader announcements for live WS updates */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {liveAnnouncement}
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-black dark:text-white">Task Tracker</h1>
          <span className="text-xs text-black/40 dark:text-slate-500 flex items-center gap-1.5" aria-label="Live updates active">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" aria-hidden="true" />
            Live — updates in real-time
          </span>
        </div>

        {loading ? (
          <div role="status" aria-live="polite" className="text-sm text-black/60 dark:text-slate-400">
            Loading tasks…
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 text-black/50 dark:text-slate-400">
            <p className="text-sm">No tasks assigned yet.</p>
            <p className="text-xs mt-1">Assign tasks from a project's stage tracker.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full text-sm" aria-label="Task tracker">
              <thead>
                <tr className="bg-black/3 dark:bg-white/3 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white whitespace-nowrap">Date Assigned</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Task</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white whitespace-nowrap">Project</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Client</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Owner</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-black/1 dark:hover:bg-white/1 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-black/60 dark:text-slate-400 tabular-nums">
                      {fmtDate(task.assigned_at)}
                    </td>
                    <td className="px-4 py-3 text-black dark:text-white max-w-xs">
                      {task.stage_display}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        to={`/crm/projects/${task.project_id}`}
                        className="font-medium text-mustard hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                        aria-label={`Open project ${task.project_no}`}
                      >
                        {task.project_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/crm/clients/${task.client_phone}`}
                        className="hover:underline text-black dark:text-white focus-visible:ring-2 focus-visible:ring-mustard rounded"
                        aria-label={`Open client ${task.client_name}`}
                      >
                        {task.client_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-black dark:text-white">
                      {task.assigned_by_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-black dark:text-white">
                      {task.assigned_to_name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={task.task_status}
                        onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                        disabled={updatingId === task.id}
                        aria-label={`Status for ${task.stage_display}`}
                        className={`text-xs px-2 py-1 rounded border-0 font-medium focus:outline-none focus:ring-2 focus:ring-mustard cursor-pointer disabled:cursor-not-allowed ${STATUS_COLORS[task.task_status]}`}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
