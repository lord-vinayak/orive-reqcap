import { useEffect, useState, useId, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { crmApi } from '@/services/crm'
import type { CRMProjectList as Project } from '@/types/crm'
import { ProgressBar } from '@/components/crm/ProgressBar'
import { StatusBadge } from '@/components/crm/StatusBadge'
import { getPipelineLeadStatus, PIPELINE_LEAD_STATUS_LABEL } from '@/constants/clientStatus'

const PHASE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Phases' },
  { value: 'sample', label: 'Sample Phase' },
  { value: 'order', label: 'Order / Production Phase' },
]

const stageLabel = (stage: string) => stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export default function CRMProjectList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchId = useId()
  const phaseFilterId = useId()
  const pocFilterId = useId()
  const stageFilterId = useId()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState<string>(searchParams.get('phase') ?? '')
  const [pocFilter, setPocFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [delayedOnly, setDelayedOnly] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // Options derived from the currently loaded projects — ponytail: no extra endpoint needed
  const pocOptions = useMemo(() => {
    const names = new Set<string>()
    projects.forEach((p) => { if (p.sales_poc_name) names.add(p.sales_poc_name); if (p.formulation_poc_name) names.add(p.formulation_poc_name) })
    return [...names].sort()
  }, [projects])

  const stageOptions = useMemo(() => {
    const stages = new Set(projects.map((p) => p.project_stage).filter(Boolean))
    return [...stages].sort()
  }, [projects])

  const filteredProjects = useMemo(() => projects.filter((p) => {
    if (pocFilter && p.sales_poc_name !== pocFilter && p.formulation_poc_name !== pocFilter) return false
    if (stageFilter && p.project_stage !== stageFilter) return false
    if (delayedOnly && !p.has_delays) return false
    if (dateFrom && (!p.sample_booked_date || p.sample_booked_date < dateFrom)) return false
    if (dateTo && (!p.sample_booked_date || p.sample_booked_date > dateTo)) return false
    return true
  }), [projects, pocFilter, stageFilter, delayedOnly, dateFrom, dateTo])

  const fetchProjects = (q = '', phase = '') => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (q) params.search = q
    if (phase) params.phase = phase
    crmApi.listProjects(params)
      .then((r) => {
        setProjects(r.data.results)
        if (q || phase) {
          const count = r.data.results.length
          setStatusMessage(count > 0 ? `${count} project${count !== 1 ? 's' : ''} found.` : 'No projects found.')
          setTimeout(() => setStatusMessage(''), 3000)
        }
      })
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
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{statusMessage}</div>
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
          <div>
            <label htmlFor={pocFilterId} className="sr-only">Filter by POC</label>
            <select
              id={pocFilterId}
              value={pocFilter}
              onChange={(e) => setPocFilter(e.target.value)}
              className="border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
              aria-label="Filter by POC"
            >
              <option value="">All POCs</option>
              {pocOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={stageFilterId} className="sr-only">Filter by stage</label>
            <select
              id={stageFilterId}
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
              aria-label="Filter by stage"
            >
              <option value="">All Stages</option>
              {stageOptions.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
            </select>
          </div>
          <div className="flex gap-1 items-center">
            <label htmlFor="date-from" className="sr-only">Sample booked from</label>
            <input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Sample booked date from"
              className="border border-black/20 dark:border-white/20 rounded px-2 py-2 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard" />
            <span className="text-black/40 dark:text-slate-500 text-sm">–</span>
            <label htmlFor="date-to" className="sr-only">Sample booked to</label>
            <input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              aria-label="Sample booked date to"
              className="border border-black/20 dark:border-white/20 rounded px-2 py-2 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard" />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-black/70 dark:text-slate-300 px-1">
            <input type="checkbox" checked={delayedOnly} onChange={(e) => setDelayedOnly(e.target.checked)} className="rounded accent-mustard" />
            Delayed only
          </label>
          <button type="submit" className="btn-primary text-sm px-4">Search</button>
        </form>

        {loading ? (
          <div role="status" aria-live="polite" aria-atomic="true" className="text-black/60 dark:text-slate-300 text-sm">
            Loading projects…
          </div>
        ) : filteredProjects.length === 0 ? (
          <p role="status" aria-live="polite" aria-atomic="true" className="text-black/60 dark:text-slate-300 text-sm">No projects found.</p>
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
                {filteredProjects.map((p) => (
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
                    <td className="px-4 py-3 text-black/70 dark:text-slate-300">
                      {PIPELINE_LEAD_STATUS_LABEL[getPipelineLeadStatus(p.client_lead_status)]}
                    </td>
                    <td className="px-4 py-3 w-36">
                      <ProgressBar value={p.progress_percentage} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.overall_status} />
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
