import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { crmApi } from '@/services/crm'
import type { DashboardStats, CRMProjectList } from '@/types/crm'
import { StatusBadge } from '@/components/crm/StatusBadge'
import { ProgressBar } from '@/components/crm/ProgressBar'
import { LeadStatusBadge } from '@/components/LeadStatusBadge'
import type { LeadStatus } from '@/constants/clientStatus'

export default function CRMDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [projects, setProjects] = useState<CRMProjectList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([crmApi.getDashboardStats(), crmApi.getHealthTable()])
      .then(([statsRes, projectsRes]) => {
        setStats(statsRes.data)
        setProjects(projectsRes.data)
      })
      .catch(() => setError('Failed to load dashboard. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  const stageEntries = stats
    ? Object.entries(stats.stage_distribution).filter(([, count]) => count > 0)
    : []

  return (
    <Layout title="CRM Dashboard">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black dark:text-white">CRM Dashboard</h1>
          <Link
            to="/crm/projects/new"
            className="btn-primary text-sm"
            aria-label="Create a new CRM project"
          >
            + New Project
          </Link>
        </div>

        {error && (
          <div role="alert" className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div role="status" aria-live="polite" className="text-black/60 dark:text-slate-400 text-sm">
            Loading dashboard…
          </div>
        ) : stats && (
          <>
            {/* ── Summary cards ── */}
            <section aria-labelledby="summary-heading">
              <h2 id="summary-heading" className="sr-only">Summary statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Projects" value={stats.total_projects} />
                <StatCard label="Delayed Projects" value={stats.delayed_projects} accent="red" />
                <StatCard label="In Proposal" value={stats.pipeline.proposal} />
                <StatCard label="In Packaging" value={stats.pipeline.packaging} />
              </div>
            </section>

            {/* ── Pipeline visibility ── */}
            <section aria-labelledby="pipeline-heading">
              <h2 id="pipeline-heading" className="text-lg font-semibold text-black dark:text-white mb-3">
                Pipeline
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <PipelineCard label="Proposal Stage" count={stats.pipeline.proposal} stageKey="proposal" />
                <PipelineCard label="Sample In Pipeline" count={stats.pipeline.sample_in_pipeline} stageKey="sample" />
                <PipelineCard label="Packaging Stage" count={stats.pipeline.packaging} stageKey="packaging" />
              </div>
            </section>

            {/* ── Stage distribution ── */}
            <section aria-labelledby="distribution-heading">
              <h2 id="distribution-heading" className="text-lg font-semibold text-black dark:text-white mb-3">
                Stage Distribution
              </h2>
              {stageEntries.length === 0 ? (
                <p className="text-black/60 dark:text-slate-400 text-sm">No projects yet.</p>
              ) : (
                <div className="space-y-2" role="list" aria-label="Project count per stage">
                  {stageEntries.map(([stage, count]) => (
                    <div key={stage} role="listitem" className="flex items-center gap-3">
                      <span className="w-40 text-sm text-black/70 dark:text-slate-300 truncate">{stage}</span>
                      <div className="flex-1 bg-black/10 dark:bg-white/10 rounded-full h-3" aria-hidden="true">
                        <div
                          className="bg-mustard h-3 rounded-full transition-all"
                          style={{ width: `${Math.min((count / stats.total_projects) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-black dark:text-white w-6 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Project health table ── */}
            <section aria-labelledby="health-heading">
              <h2 id="health-heading" className="text-lg font-semibold text-black dark:text-white mb-3">
                Project Health
              </h2>
              {projects.length === 0 ? (
                <p className="text-black/60 dark:text-slate-400 text-sm">No projects to display.</p>
              ) : (
                <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
                  <table className="w-full text-sm" aria-label="Project health overview">
                    <thead>
                      <tr className="bg-black/5 dark:bg-white/5 text-left">
                        <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Project</th>
                        <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Client</th>
                        <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Lead Status</th>
                        <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Stage</th>
                        <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Progress</th>
                        <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Status</th>
                        <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Next Milestone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {projects.map((p) => (
                        <tr key={p.id} className="hover:bg-black/2 dark:hover:bg-white/2">
                          <td className="px-4 py-3">
                            <Link
                              to={`/crm/projects/${p.id}`}
                              className="font-medium text-mustard hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                              aria-label={`Open project ${p.project_no}`}
                            >
                              {p.project_no}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-black/80 dark:text-slate-300">
                            <Link to={`/crm/clients/${p.client}`} className="hover:underline">
                              {p.client_name}
                            </Link>
                            {p.client_company && (
                              <div className="text-xs text-black/50 dark:text-slate-500">{p.client_company}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <LeadStatusBadge
                              client={{ phone_no: p.client_phone, lead_status: p.client_lead_status as LeadStatus, lead_sub_status: p.client_lead_sub_status }}
                              onUpdated={(patch) => setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, ...patch } : x))}
                            />
                          </td>
                          <td className="px-4 py-3 text-black/70 dark:text-slate-300 capitalize">
                            {p.project_stage.replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3 w-40">
                            <ProgressBar value={p.progress_percentage} size="sm" />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge hasDelays={p.has_delays} />
                          </td>
                          <td className="px-4 py-3 text-black/60 dark:text-slate-400 text-xs">
                            {p.next_milestone
                              ? `${p.next_milestone.display} · ${p.next_milestone.planned_date}`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'red' }) {
  return (
    <div
      className="bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-lg p-4"
      role="figure"
      aria-label={`${label}: ${value}`}
    >
      <div className={`text-3xl font-bold ${accent === 'red' ? 'text-red-600 dark:text-red-400' : 'text-mustard'}`}>
        {value}
      </div>
      <div className="text-sm text-black/60 dark:text-slate-400 mt-1">{label}</div>
    </div>
  )
}

function PipelineCard({ label, count, stageKey }: { label: string; count: number; stageKey: string }) {
  return (
    <Link
      to={`/crm/projects?stage=${stageKey}`}
      className="block bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-lg p-4 hover:border-mustard focus-visible:ring-2 focus-visible:ring-mustard transition-colors"
      aria-label={`${label}: ${count} projects`}
    >
      <div className="text-2xl font-bold text-black dark:text-white">{count}</div>
      <div className="text-sm text-black/60 dark:text-slate-400 mt-1">{label}</div>
    </Link>
  )
}
