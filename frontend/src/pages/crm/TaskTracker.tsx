import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { crmApi } from '@/services/crm'
import { useTaskSocket } from '@/hooks/useTaskSocket'
import { useAuthStore } from '@/store/authStore'
import TaskCommentPanel from '@/components/crm/TaskCommentPanel'
import NewTaskModal from '@/components/crm/NewTaskModal'
import type { TaskItem, TaskStatus, TaskPriority } from '@/types/crm'
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

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  medium: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  low: 'bg-black/5 dark:bg-white/5 text-black/50 dark:text-slate-500',
}

export default function TaskTracker() {
  const user = useAuthStore((s) => s.user)
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [liveAnnouncement, setLiveAnnouncement] = useState('')
  const [commentTask, setCommentTask] = useState<TaskItem | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)

  // ── Filters ────────────────────────────────────────────────────────────────
  const [filterOwner, setFilterOwner] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')

  const isFiltered = !!(filterOwner || filterStatus || filterPriority || filterClient || filterDateFrom)

  const resetFilters = () => {
    setFilterOwner('')
    setFilterStatus('')
    setFilterPriority('')
    setFilterClient('')
    setFilterDateFrom('')
  }

  // Unique owner and client options derived from loaded tasks
  const ownerOptions = Array.from(
    new Set(tasks.map((t) => t.assigned_to_name).filter(Boolean))
  ).sort() as string[]

  const clientOptions = Array.from(
    new Set(tasks.map((t) => t.client_name).filter(Boolean))
  ).sort() as string[]

  const filteredTasks = tasks.filter((t) => {
    if (filterOwner && t.assigned_to_name !== filterOwner) return false
    if (filterStatus && t.task_status !== filterStatus) return false
    if (filterPriority && (t.priority ?? 'medium') !== filterPriority) return false
    if (filterClient && t.client_name !== filterClient) return false
    if (filterDateFrom && t.assigned_at) {
      if (t.assigned_at.slice(0, 10) !== filterDateFrom) return false
    }
    return true
  })

  const upsertTask = useCallback((updated: TaskItem) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === updated.id)
      if (idx === -1) {
        setLiveAnnouncement(`New task: ${updated.title}`)
        return [updated, ...prev]
      }
      const next = [...prev]
      next[idx] = updated
      setLiveAnnouncement(`Task updated: ${updated.title} is now ${TASK_STATUS_LABELS[updated.task_status]}`)
      return next
    })
  }, [])

  useTaskSocket(upsertTask)

  useEffect(() => {
    Promise.all([
      crmApi.listTasks(),
      crmApi.listStandaloneTasks(),
    ]).then(([stageRes, standaloneRes]) => {
      const stageTasks: TaskItem[] = Array.isArray(stageRes.data)
        ? stageRes.data
        : (stageRes.data as any).results ?? []
      const standaloneTasks: TaskItem[] = Array.isArray(standaloneRes.data)
        ? standaloneRes.data
        : (standaloneRes.data as any).results ?? []
      // Merge and sort by assigned_at desc
      const all = [...stageTasks, ...standaloneTasks].sort((a, b) => {
        const ta = a.assigned_at ?? a.last_updated_at ?? ''
        const tb = b.assigned_at ?? b.last_updated_at ?? ''
        return tb.localeCompare(ta)
      })
      setTasks(all)
    }).finally(() => setLoading(false))
  }, [])

  const canUpdateStatus = (task: TaskItem) => {
    if (user?.role === 'admin') return true
    return task.assigned_to_user_id === user?.id
  }

  const canEditPlannedDate = (task: TaskItem) => {
    if (user?.role === 'admin') return true
    return task.assigned_by_user_id === user?.id
  }

  const handlePlannedDateChange = async (task: TaskItem, newDate: string) => {
    const date = newDate || null
    try {
      let res
      if (task.task_type === 'standalone') {
        res = await crmApi.updateStandalonePlannedDate(task.id, date)
      } else {
        res = await crmApi.updateStagePlannedDate(task.project_id!, task.stage_key!, date)
      }
      upsertTask(res.data)
    } catch {
      // WS will self-correct if broadcast fires; silently ignore otherwise
    }
  }

  const handleStatusChange = async (task: TaskItem, newStatus: TaskStatus) => {
    setUpdatingId(task.id)
    try {
      if (task.task_type === 'standalone') {
        const res = await crmApi.updateStandaloneTask(task.id, { task_status: newStatus })
        upsertTask(res.data)
      } else {
        await crmApi.updateTaskStatus(task.project_id!, task.stage_key!, newStatus)
        // WS broadcast will update state; also optimistically update
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, task_status: newStatus } : t))
        )
      }
    } catch {
      // ignore — WS / optimistic update will self-correct
    } finally {
      setUpdatingId(null)
    }
  }

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const fmtRelative = (iso: string | null) => {
    if (!iso) return null
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return fmtDate(iso)
  }

  return (
    <Layout title="Task Tracker">
      <div className="space-y-6">
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {liveAnnouncement}
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-black dark:text-white">Task Tracker</h1>
            <span className="text-xs text-black/40 dark:text-slate-500 flex items-center gap-1.5" aria-label="Live updates active">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" aria-hidden="true" />
              Live
            </span>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowNewTask(true)}
              aria-label="Create new task"
              className="px-4 py-2 bg-mustard text-white text-sm font-medium rounded-xl hover:bg-mustard/90 transition-colors"
            >
              + New Task
            </button>
          )}
        </div>

        {/* Filter bar — always visible, full width grid */}
        <div
          role="group"
          aria-label="Filter tasks"
          className="grid grid-cols-6 gap-3 p-4 rounded-xl bg-black/3 dark:bg-white/3 border border-black/6 dark:border-white/6"
        >
          {/* Owner */}
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-owner" className="text-xs font-medium text-black/50 dark:text-slate-400">Owner</label>
            <select
              id="filter-owner"
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="w-full text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
            >
              <option value="">All owners</option>
              {ownerOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-status" className="text-xs font-medium text-black/50 dark:text-slate-400">Status</label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-priority" className="text-xs font-medium text-black/50 dark:text-slate-400">Priority</label>
            <select
              id="filter-priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
            >
              <option value="">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Client */}
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-client" className="text-xs font-medium text-black/50 dark:text-slate-400">Client</label>
            <select
              id="filter-client"
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="w-full text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
            >
              <option value="">All clients</option>
              {clientOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Date Assigned */}
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-date" className="text-xs font-medium text-black/50 dark:text-slate-400">Assigned on</label>
            <input
              id="filter-date"
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
            />
          </div>

          {/* Reset — always visible */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-transparent select-none" aria-hidden="true">Reset</span>
            <button
              onClick={resetFilters}
              disabled={!isFiltered}
              aria-label="Reset all filters"
              className="w-full py-1.5 text-sm rounded-lg border border-black/15 dark:border-white/15 text-black/60 dark:text-slate-400 hover:border-red-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-black/15 disabled:hover:text-black/60 dark:disabled:hover:border-white/15 dark:disabled:hover:text-slate-400 transition-colors"
            >
              ✕ Reset
            </button>
          </div>
        </div>

        {loading ? (
          <div role="status" aria-live="polite" className="text-sm text-black/60 dark:text-slate-400">
            Loading tasks…
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 text-black/50 dark:text-slate-400">
            <p className="text-sm">No tasks yet.</p>
            {user?.role === 'admin' && (
              <p className="text-xs mt-1">Create a standalone task or assign stages from a project.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full text-sm" aria-label="Task tracker">
              <thead>
                <tr className="bg-black/3 dark:bg-white/3 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white whitespace-nowrap">Date Assigned</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white whitespace-nowrap">Planned Close</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Task</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Project</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Client</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Priority</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Owner</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white whitespace-nowrap">Actual Close</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-black/40 dark:text-slate-500">
                      No tasks match the selected filters.{' '}
                      <button onClick={resetFilters} className="underline hover:text-mustard transition-colors">
                        Reset filters
                      </button>
                    </td>
                  </tr>
                )}
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-black/1 dark:hover:bg-white/1 transition-colors align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-black/60 dark:text-slate-400 tabular-nums">
                      {fmtDate(task.assigned_at)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {canEditPlannedDate(task) ? (
                        <input
                          type="date"
                          defaultValue={task.planned_closure_date ?? ''}
                          onBlur={(e) => {
                            const val = e.target.value
                            const prev = task.planned_closure_date ?? ''
                            if (val !== prev) handlePlannedDateChange(task, val)
                          }}
                          aria-label={`Planned closure date for ${task.title}`}
                          className="text-xs px-1.5 py-0.5 rounded border border-black/15 dark:border-white/15 bg-transparent text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-mustard cursor-pointer"
                        />
                      ) : (
                        <span className="text-sm text-black/60 dark:text-slate-400 tabular-nums">
                          {fmtDate(task.planned_closure_date)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="font-medium text-black dark:text-white leading-snug">{task.title}</div>
                      {(task.last_updated_at || task.last_updated_by_name) && (
                        <div className="text-xs text-black/40 dark:text-slate-500 mt-0.5">
                          Updated {fmtRelative(task.last_updated_at)}
                          {task.last_updated_by_name ? ` by ${task.last_updated_by_name}` : ''}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {task.project_id ? (
                        <Link
                          to={`/crm/projects/${task.project_id}`}
                          className="font-medium text-mustard hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                        >
                          {task.project_no}
                        </Link>
                      ) : (
                        <span className="text-black/30 dark:text-slate-600">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {task.client_phone ? (
                        <Link
                          to={`/crm/clients/${task.client_phone}`}
                          className="hover:underline text-black dark:text-white focus-visible:ring-2 focus-visible:ring-mustard rounded"
                        >
                          {task.client_name}
                        </Link>
                      ) : (
                        <span className="text-black/30 dark:text-slate-600">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority ?? 'medium']}`}>
                        {(task.priority ?? 'medium').charAt(0).toUpperCase() + (task.priority ?? 'medium').slice(1)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-black dark:text-white whitespace-nowrap">
                      {task.assigned_to_name ?? <span className="text-black/30 dark:text-slate-600">—</span>}
                    </td>

                    <td className="px-4 py-3">
                      {canUpdateStatus(task) ? (
                        <select
                          value={task.task_status}
                          onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                          disabled={updatingId === task.id}
                          aria-label={`Status for ${task.title}`}
                          className={`text-xs px-2 py-1 rounded border-0 font-medium focus:outline-none focus:ring-2 focus:ring-mustard cursor-pointer disabled:cursor-not-allowed ${STATUS_COLORS[task.task_status]}`}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLORS[task.task_status]}`}>
                          {TASK_STATUS_LABELS[task.task_status]}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-black/60 dark:text-slate-400 tabular-nums">
                      {fmtDate(task.actual_closure_date)}
                    </td>

                    <td className="px-4 py-3 max-w-[180px]">
                      <button
                        onClick={() => setCommentTask(task)}
                        className="text-left group w-full"
                        aria-label={`View comments for ${task.title}`}
                      >
                        {task.latest_comment ? (
                          <div>
                            <p className="text-xs text-black dark:text-white line-clamp-2 group-hover:text-mustard transition-colors">
                              {task.latest_comment.text}
                            </p>
                            <p className="text-xs text-black/40 dark:text-slate-500 mt-0.5">
                              {task.latest_comment.author_name} · {fmtRelative(task.latest_comment.created_at)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-black/30 dark:text-slate-600 group-hover:text-mustard transition-colors">
                            + Add comment
                          </span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {commentTask && (
        <TaskCommentPanel
          task={commentTask}
          onClose={() => setCommentTask(null)}
          onCommentAdded={(updated) => {
            upsertTask(updated)
            setCommentTask(updated)
          }}
        />
      )}

      {showNewTask && (
        <NewTaskModal
          onClose={() => setShowNewTask(false)}
          onCreated={(task) => {
            upsertTask(task)
            setShowNewTask(false)
          }}
        />
      )}
    </Layout>
  )
}
