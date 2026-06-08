import { useEffect, useRef, useState } from 'react'
import { crmApi } from '@/services/crm'
import { clientService } from '@/services'
import type { Client } from '@/types'
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
  const [members, setMembers] = useState<InternalTeamMember[]>([])
  const [projects, setProjects] = useState<CRMProjectList[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Client combobox state
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [clientSearching, setClientSearching] = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    crmApi.allTeamMembers().then((r) => {
      setMembers(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])
    })
    crmApi.listProjects().then((r) => {
      setProjects(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])
    })
  }, [])

  // Close client dropdown on outside click
  useEffect(() => {
    if (!clientDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [clientDropdownOpen])

  // Debounced client search
  const handleClientSearchChange = (value: string) => {
    setClientSearch(value)
    setSelectedClient(null)
    if (!value.trim()) {
      setClientResults([])
      setClientDropdownOpen(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setClientSearching(true)
      try {
        const data = await clientService.list({ q: value.trim() })
        const results = Array.isArray(data) ? data : (data as any).results ?? []
        setClientResults(results)
        setClientDropdownOpen(true)
      } finally {
        setClientSearching(false)
      }
    }, 300)
  }

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client)
    setClientSearch('')
    setClientDropdownOpen(false)
    setClientResults([])
  }

  const clearClient = () => {
    setSelectedClient(null)
    setClientSearch('')
    setClientResults([])
  }

  // When a project is selected, auto-fill client from that project
  const handleProjectChange = (pid: string) => {
    setProjectId(pid)
    if (pid) {
      const proj = projects.find((p) => p.id === pid)
      if (proj) {
        // Build a minimal Client-like object so the display shows name
        setSelectedClient({ phone_no: proj.client, name: proj.client_name } as Client)
        setClientSearch('')
        setClientDropdownOpen(false)
      }
    } else {
      clearClient()
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
        client: selectedClient?.phone_no || null,
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

        {/* Client searchable combobox */}
        <div ref={clientRef} className="relative">
          <label className="block text-xs font-semibold text-black/60 dark:text-slate-400 mb-1">
            Client <span className="text-black/30 dark:text-slate-600 font-normal">(optional)</span>
          </label>

          {selectedClient ? (
            // Selected state — show chip with clear button
            <div className="flex items-center gap-2 px-3 py-2 border border-mustard/50 rounded-lg bg-mustard/5 dark:bg-mustard/10">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black dark:text-white truncate">{selectedClient.name}</p>
                <p className="text-xs text-black/40 dark:text-slate-500">{selectedClient.phone_no}</p>
              </div>
              <button
                type="button"
                onClick={clearClient}
                aria-label="Clear client"
                className="text-black/30 dark:text-slate-600 hover:text-black dark:hover:text-white transition-colors shrink-0"
              >
                ✕
              </button>
            </div>
          ) : (
            // Search input
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => handleClientSearchChange(e.target.value)}
              onFocus={() => clientResults.length > 0 && setClientDropdownOpen(true)}
              placeholder="Search by name or phone number…"
              className="w-full text-sm border border-black/20 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-black dark:text-white placeholder-black/30 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-mustard"
            />
          )}

          {/* Dropdown results */}
          {clientDropdownOpen && !selectedClient && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {clientSearching ? (
                <p className="px-3 py-2 text-xs text-black/40 dark:text-slate-500">Searching…</p>
              ) : clientResults.length === 0 ? (
                <p className="px-3 py-2 text-xs text-black/40 dark:text-slate-500">No clients found</p>
              ) : (
                <ul role="listbox" aria-label="Client results">
                  {clientResults.map((c) => (
                    <li key={c.phone_no} role="option">
                      <button
                        type="button"
                        onClick={() => handleSelectClient(c)}
                        className="w-full text-left px-3 py-2 hover:bg-mustard/10 focus:bg-mustard/10 focus:outline-none"
                      >
                        <span className="text-sm font-medium text-black dark:text-white">{c.name}</span>
                        {c.company_name && (
                          <span className="text-xs text-black/40 dark:text-slate-500 ml-1">· {c.company_name}</span>
                        )}
                        <span className="block text-xs text-black/40 dark:text-slate-500">{c.phone_no}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

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
