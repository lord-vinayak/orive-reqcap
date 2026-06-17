import { useEffect, useState, useId } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { crmApi } from '@/services/crm'
import type { CRMProjectList as Project } from '@/types/crm'
import { ProgressBar } from '@/components/crm/ProgressBar'
import { StatusBadge } from '@/components/crm/StatusBadge'

const PHASE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Phases' },
  { value: 'sample', label: 'Sample Phase' },
  { value: 'order', label: 'Order / Production Phase' },
]

export default function CRMProjectList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchId = useId()
  const phaseFilterId = useId()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState<string>(searchParams.get('phase') ?? '')

  const fetchProjects = (q = '', phase = '') => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (q) params.search = q
    if (phase) params.phase = phase
    crmApi.listProjects(params)
      .then((r) => setProjects(r.data.results))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProjects(search, phaseFilter) }, [phaseFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProjects(search, phaseFilter)
  }

  return (
    <Layout title="CRM Projects">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-black dark:text-white">Projects</h1>
          <Link to="/crm/projects/new" className="btn-primary text-sm" aria-label="Create a new project">
            + New Project
          </Link>
        </div>

        {/* Filters */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-wrap" role="search" aria-label="Filter projects">
          <div className="flex flex-1 gap-2">
            <label htmlFor={searchId} className="sr-only">Search projects by project number, client name or phone</label>
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project no, client name or phone…"
              className="flex-1 border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
            />
          </div>
          <div>
            <label htmlFor={phaseFilterId} className="sr-only">Filter by phase</label>
            <select
              id={phaseFilterId}
              value={phaseFilter}
              onChange={(e) => { setPhaseFilter(e.target.value); setSearchParams(e.target.value ? { phase: e.target.value } : {}) }}
              className="border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
              aria-label="Filter by project phase"
            >
              {PHASE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary text-sm px-4">Search</button>
        </form>

        {loading ? (
          <div role="status" aria-live="polite" className="text-black/60 dark:text-slate-300 text-sm">
            Loading projects…
          </div>
        ) : projects.length === 0 ? (
          <p role="status" aria-live="polite" className="text-black/60 dark:text-slate-300 text-sm">No projects found.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
            <table className="w-full text-sm" aria-label="Project list">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Client</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Project No</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Stage</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Progress</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-black/2 dark:hover:bg-white/2">
                    <td className="px-4 py-3">
                      <Link to={`/crm/clients/${p.client}`} className="hover:underline text-black dark:text-white font-medium">
                        {p.client_name}
                      </Link>
                      {p.client_company && (
                        <div className="text-xs text-black/70 dark:text-slate-300">{p.client_company}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/crm/projects/${p.id}`}
                        className="font-medium text-mustard hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                        aria-label={`Open project ${p.project_no}`}
                      >
                        {p.project_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-black/70 dark:text-slate-300 capitalize">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.phase === 'order'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {p.phase === 'order' ? 'Order Phase' : 'Sample Phase'}
                      </span>
                    </td>
                    <td className="px-4 py-3 w-36">
                      <ProgressBar value={p.progress_percentage} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge hasDelays={p.has_delays} />
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
