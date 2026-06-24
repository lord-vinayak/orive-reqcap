import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { crmApi } from '@/services/crm'
import { clientService } from '@/services'
import { useTaskSocket } from '@/hooks/useTaskSocket'
import { useAuthStore } from '@/store/authStore'
import TaskCommentPanel from '@/components/crm/TaskCommentPanel'
import NewTaskModal from '@/components/crm/NewTaskModal'
import type { TaskItem, TaskStatus, TaskPriority, InternalTeamMember } from '@/types/crm'
import { TASK_STATUS_LABELS } from '@/types/crm'
import type { Client } from '@/types'
import { LeadStatusBadge } from '@/components/LeadStatusBadge'
import type { LeadStatus } from '@/constants/clientStatus'

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'wip', label: 'WIP' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
]

const STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-slate-300',
  wip: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  pending: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  closed: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  medium: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  low: 'bg-black/5 dark:bg-white/5 text-black/70 dark:text-slate-300',
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

  // All system owners and clients (for filter dropdowns — full lists, not just task-derived)
  const [allTeamMembers, setAllTeamMembers] = useState<InternalTeamMember[]>([])
  const [allClients, setAllClients] = useState<Client[]>([])

  // Client combobox state
  const [clientSearch, setClientSearch] = useState('')
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const clientComboRef = useRef<HTMLDivElement>(null)

  const isFiltered = !!(filterOwner || filterStatus || filterPriority || filterClient || filterDateFrom)

  const resetFilters = () => {
    setFilterOwner('')
    setFilterStatus('')
    setFilterPriority('')
    setFilterClient('')
    setClientSearch('')
    setClientDropdownOpen(false)
    setFilterDateFrom('')
  }

  // Close client dropdown on outside click
  useEffect(() => {
    if (!clientDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (clientComboRef.current && !clientComboRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [clientDropdownOpen])

  // Owner options: all team members in the system
  const ownerOptions = allTeamMembers.map((m) => m.name)

  // Client options: all clients in the system
  const clientOptions = allClients.map((c) => c.name)

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
    // Fetch all team members for the Owner filter (full system list)
    crmApi.allTeamMembers().then((r) => {
      const data = Array.isArray(r.data) ? r.data : (r.data as any).results ?? []
      setAllTeamMembers(data.sort((a: InternalTeamMember, b: InternalTeamMember) => a.name.localeCompare(b.name)))
    })

    // Fetch all clients for the Client filter (full system list, large page_size)
    clientService.list({ page_size: 2000 } as any).then((data) => {
      const clients: Client[] = Array.isArray(data) ? data : (data as any).results ?? []
      setAllClients(clients.sort((a, b) => a.name.localeCompare(b.name)))
    })

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
        const res = await crmApi.updateTaskStatus(task.project_id!, task.stage_key!, newStatus)
        upsertTask(res.data)
      }
    } catch {
      // ignore — WS / optimistic update will self-correct
    } finally {
      setUpdatingId(null)
    }
  }

  const isDelayed = (task: TaskItem) => {
    if (task.task_status === 'closed') return false
    if (!task.planned_closure_date) return false
    return task.planned_closure_date < new Date().toISOString().slice(0, 10)
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
            <span className="text-xs text-black/60 dark:text-slate-300 flex items-center gap-1.5" aria-label="Live updates active">
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
            <label htmlFor="filter-owner" className="text-xs font-medium text-black/70 dark:text-slate-300">Owner</label>
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
            <label htmlFor="filter-status" className="text-xs font-medium text-black/70 dark:text-slate-300">Status</label>
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
            <label htmlFor="filter-priority" className="text-xs font-medium text-black/70 dark:text-slate-300">Priority</label>
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

          {/* Client — searchable combobox */}
          <div className="flex flex-col gap-1" ref={clientComboRef}>
            <label htmlFor="filter-client-search" className="text-xs font-medium text-black/70 dark:text-slate-300">Client</label>
            <div className="relative">
              {filterClient ? (
                // Selected state — chip with clear
                <div className="flex items-center gap-1.5 w-full text-sm border border-mustard/50 rounded-lg px-2 py-1.5 bg-mustard/5 dark:bg-mustard/10">
                  <span className="flex-1 truncate text-black dark:text-white">{filterClient}</span>
                  <button
                    type="button"
                    onClick={() => { setFilterClient(''); setClientSearch('') }}
                    aria-label="Clear client filter"
                    className="shrink-0 text-black/60 dark:text-slate-300 hover:text-black dark:hover:text-white focus-visible:ring-1 focus-visible:ring-mustard rounded"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </div>
              ) : (
                // Search input
                <input
                  id="filter-client-search"
                  type="text"
                  role="combobox"
                  aria-expanded={clientDropdownOpen}
                  aria-autocomplete="list"
                  aria-controls="filter-client-listbox"
                  aria-haspopup="listbox"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                    setClientDropdownOpen(true)
                  }}
                  onFocus={() => setClientDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setClientDropdownOpen(false); setClientSearch('') }
                  }}
                  placeholder="Search client…"
                  className="w-full text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-black dark:text-white placeholder-black/30 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-mustard"
                />
              )}

              {/* Dropdown */}
              {clientDropdownOpen && !filterClient && (
                <ul
                  id="filter-client-listbox"
                  role="listbox"
                  aria-label="Client options"
                  className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-lg shadow-lg max-h-52 overflow-y-auto"
                >
                  {(() => {
                    const q = clientSearch.trim().toLowerCase()
                    const matches = clientOptions.filter((c) => !q || c.toLowerCase().includes(q))
                    if (matches.length === 0) {
                      return (
                        <li className="px-3 py-2 text-xs text-black/60 dark:text-slate-300">No clients found</li>
                      )
                    }
                    return matches.map((c) => (
                      <li
                        key={c}
                        role="option"
                        aria-selected={filterClient === c}
                        tabIndex={0}
                        onClick={() => { setFilterClient(c); setClientSearch(''); setClientDropdownOpen(false) }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setFilterClient(c); setClientSearch(''); setClientDropdownOpen(false)
                          }
                        }}
                        className="px-3 py-2 text-sm text-black dark:text-white hover:bg-mustard/10 focus:bg-mustard/10 focus:outline-none cursor-pointer"
                      >
                        {c}
                      </li>
                    ))
                  })()}
                </ul>
              )}
            </div>
          </div>

          {/* Date Assigned */}
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-date" className="text-xs font-medium text-black/70 dark:text-slate-300">Assigned on</label>
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
              className="w-full py-1.5 text-sm rounded-lg border border-black/15 dark:border-white/15 text-black/60 dark:text-slate-300 hover:border-red-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-black/15 disabled:hover:text-black/60 dark:disabled:hover:border-white/15 dark:disabled:hover:text-slate-300 transition-colors"
            >
              ✕ Reset
            </button>
          </div>
        </div>

        {loading ? (
          <div role="status" aria-live="polite" className="text-sm text-black/60 dark:text-slate-300">
            Loading tasks…
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 text-black/70 dark:text-slate-300">
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
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Client</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white whitespace-nowrap">Lead Status</th>
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
                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-black/60 dark:text-slate-300">
                      No tasks match the selected filters.{' '}
                      <button onClick={resetFilters} className="underline hover:text-mustard transition-colors">
                        Reset filters
                      </button>
                    </td>
                  </tr>
                )}
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-black/1 dark:hover:bg-white/1 transition-colors align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-black/60 dark:text-slate-300 tabular-nums">
                      {fmtDate(task.assigned_at)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
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
                          <span className="text-sm text-black/60 dark:text-slate-300 tabular-nums">
                            {fmtDate(task.planned_closure_date)}
                          </span>
                        )}
                        {isDelayed(task) && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 w-fit">
                            <span aria-hidden="true">⚠</span> Delayed
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="font-medium text-black dark:text-white leading-snug">{task.title}</div>
                      {(task.last_updated_at || task.last_updated_by_name) && (
                        <div className="text-xs text-black/60 dark:text-slate-300 mt-0.5">
                          Updated {fmtRelative(task.last_updated_at)}
                          {task.last_updated_by_name ? ` by ${task.last_updated_by_name}` : ''}
                        </div>
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
                        <span className="text-black/50 dark:text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {task.client_phone && task.client_lead_status ? (
                        <LeadStatusBadge
                          client={{
                            phone_no: task.client_phone,
                            lead_status: task.client_lead_status as LeadStatus,
                            lead_sub_status: task.client_lead_sub_status ?? '',
                          }}
                          onUpdated={(patch) => setTasks((prev) => prev.map((t) =>
                            t.client_phone === task.client_phone
                              ? { ...t, client_lead_status: patch.lead_status, client_lead_sub_status: patch.lead_sub_status }
                              : t
                          ))}
                        />
                      ) : (
                        <span className="text-black/50 dark:text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority ?? 'medium']}`}>
                        {(task.priority ?? 'medium').charAt(0).toUpperCase() + (task.priority ?? 'medium').slice(1)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-black dark:text-white whitespace-nowrap">
                      {task.assigned_to_name ?? <span className="text-black/50 dark:text-slate-400">—</span>}
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

                    <td className="px-4 py-3 whitespace-nowrap text-black/60 dark:text-slate-300 tabular-nums">
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
                            <p className="text-xs text-black/60 dark:text-slate-300 mt-0.5">
                              {task.latest_comment.author_name} · {fmtRelative(task.latest_comment.created_at)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-black/50 dark:text-slate-400 group-hover:text-mustard transition-colors">
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
