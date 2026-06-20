import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Layout from '@/components/Layout'
import { crmApi } from '@/services/crm'
import type { DashboardStats, CRMProjectList } from '@/types/crm'
import { StatusBadge } from '@/components/crm/StatusBadge'
import { ProgressBar } from '@/components/crm/ProgressBar'
import { LeadStatusBadge } from '@/components/LeadStatusBadge'
import type { LeadStatus } from '@/constants/clientStatus'
import { useAuthStore } from '@/store/authStore'

type SegmentKey = 'sample' | 'order_active' | 'completed'

const SEGMENT_LABELS: Record<SegmentKey, string> = {
  sample:       'Sample Stage',
  order_active: 'Order in Progress',
  completed:    'Completed Orders',
}

export default function CRMDashboard() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [projects, setProjects] = useState<CRMProjectList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSegment, setActiveSegment] = useState<SegmentKey | null>(null)

  useEffect(() => {
    Promise.all([crmApi.getDashboardStats(), crmApi.getHealthTable()])
      .then(([statsRes, projectsRes]) => {
        setStats(statsRes.data)
        setProjects(projectsRes.data)
      })
      .catch(() => setError('Failed to load dashboard. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  const filteredProjects = useMemo(() => {
    if (!activeSegment) return projects
    if (activeSegment === 'sample')       return projects.filter(p => p.phase === 'sample')
    if (activeSegment === 'order_active') return projects.filter(p => p.phase === 'order' && p.progress_percentage < 100)
    if (activeSegment === 'completed')    return projects.filter(p => p.phase === 'order' && p.progress_percentage === 100)
    return projects
  }, [projects, activeSegment])

  return (
    <Layout title="CRM Dashboard">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black dark:text-white">Dashboard</h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to="/crm/financials"
                className="btn-secondary text-sm"
                aria-label="View Net P&L financial summary"
              >
                Net P&L
              </Link>
            )}
            <Link
              to="/crm/projects/new"
              className="btn-primary text-sm"
              aria-label="Create a new CRM project"
            >
              + New Project
            </Link>
          </div>
        </div>

        {error && (
          <div role="alert" className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div role="status" aria-live="polite" className="text-black/60 dark:text-slate-300 text-sm">
            Loading dashboard…
          </div>
        ) : stats && (
          <>
            {/* ── Summary cards ── */}
            <section aria-labelledby="summary-heading">
              <h2 id="summary-heading" className="sr-only">Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Projects" value={stats.total_projects} />
                <StatCard label="Delayed Projects" value={stats.delayed_projects} accent="red" />
                <StatCard label="Formula Pending" value={stats.pipeline.formula_pending} />
                <StatCard label="Sample in Pipeline" value={stats.pipeline.sample_in_pipeline} />
              </div>
            </section>

            {/* ── Pipeline pie chart ── */}
            <section aria-labelledby="pipeline-heading">
              <h2 id="pipeline-heading" className="text-lg font-semibold text-black dark:text-white mb-4">
                Pipeline
              </h2>
              <div className="bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-lg p-5">
                <PhasePieChart
                  data={[
                    { key: 'sample',       name: 'Sample Stage',      value: stats.phase_breakdown.sample,       color: PHASE_COLORS.sample },
                    { key: 'order_active', name: 'Order in Progress', value: stats.phase_breakdown.order_active, color: PHASE_COLORS.order_active },
                    { key: 'completed',    name: 'Completed Orders',  value: stats.phase_breakdown.completed,    color: PHASE_COLORS.completed },
                  ]}
                  activeSegment={activeSegment}
                  onSegmentClick={(key) => setActiveSegment(prev => prev === key ? null : key)}
                />
              </div>
            </section>


            {/* ── Project health table ── */}
            <section aria-labelledby="health-heading">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <h2 id="health-heading" className="text-lg font-semibold text-black dark:text-white">
                  Projects
                </h2>
                {activeSegment && (
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: PHASE_COLORS[activeSegment] }}
                    >
                      {SEGMENT_LABELS[activeSegment]}
                      <span className="text-white/70">· {filteredProjects.length}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSegment(null)}
                      className="text-xs text-black/50 dark:text-slate-400 hover:text-black dark:hover:text-white focus-visible:ring-2 focus-visible:ring-mustard rounded"
                      aria-label="Clear filter"
                    >
                      Clear ✕
                    </button>
                  </div>
                )}
              </div>
              {filteredProjects.length === 0 ? (
                <p className="text-black/60 dark:text-slate-300 text-sm">No projects to display.</p>
              ) : (
                <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
                  <table className="w-full text-sm" aria-label="Project health overview">
                    <thead>
                      <tr className="bg-black/5 dark:bg-white/5 text-left">
                        <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Project</th>
                        <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Client</th>
                        <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Project Status</th>
                        <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Stage</th>
                        <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Progress</th>
                        <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {filteredProjects.map((p) => (
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
                              <div className="text-xs text-black/50 dark:text-slate-300">{p.client_company}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <LeadStatusBadge
                              client={{ phone_no: p.client_phone, lead_status: p.client_lead_status as LeadStatus, lead_sub_status: p.client_lead_sub_status }}
                              onUpdated={(patch) => setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, client_lead_status: patch.lead_status, client_lead_sub_status: patch.lead_sub_status } : x))}
                            />
                          </td>
                          <td className="px-4 py-3 text-black/70 dark:text-slate-300 capitalize">
                            {p.phase === 'order'
                              ? 'Order Phase'
                              : p.project_stage.replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3 w-40">
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
      <div className="text-sm text-black/60 dark:text-slate-300 mt-1">{label}</div>
    </div>
  )
}

const PHASE_COLORS = {
  sample:       '#f97316',  // orange
  order_active: '#22c55e',  // green
  completed:    '#9ca3af',  // grey
}

function PhasePieChart({ data, activeSegment, onSegmentClick }: {
  data: Array<{ key: SegmentKey; name: string; value: number; color: string }>
  activeSegment: SegmentKey | null
  onSegmentClick: (key: SegmentKey) => void
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const nonEmpty = data.filter(d => d.value > 0)
  const isEmpty = nonEmpty.length === 0
  const displayData = isEmpty ? [{ key: 'sample' as SegmentKey, name: 'No projects', value: 1, color: '#e5e7eb' }] : data

  const activeIndex = activeSegment ? data.findIndex(d => d.key === activeSegment) : -1

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={displayData}
            cx="50%"
            cy="50%"
            innerRadius={68}
            outerRadius={100}
            paddingAngle={nonEmpty.length > 1 ? 2 : 0}
            dataKey="value"
            labelLine={false}
            isAnimationActive
            onClick={isEmpty ? undefined : (_, index) => onSegmentClick(data[index].key)}
            style={{ cursor: isEmpty ? 'default' : 'pointer' }}
          >
            {displayData.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={entry.color}
                stroke={activeIndex === i ? entry.color : 'none'}
                strokeWidth={activeIndex === i ? 2 : 0}
                fillOpacity={activeIndex >= 0 && activeIndex !== i ? 0.35 : 1}
                style={{ outline: 'none' }}
              />
            ))}
          </Pie>
          {!isEmpty && (
            <Tooltip
              formatter={(value, name) => {
                const v = typeof value === 'number' ? value : Number(value ?? 0)
                return [
                  `${v} project${v !== 1 ? 's' : ''} (${Math.round((v / total) * 100)}%)`,
                  String(name ?? ''),
                ]
              }}
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '0.8125rem',
              }}
            />
          )}
          <Legend
            iconType="circle"
            iconSize={10}
            formatter={(value, entry: any) => (
              <span
                style={{
                  fontSize: '0.8125rem',
                  opacity: activeIndex >= 0 && data.findIndex(d => d.name === value) !== activeIndex ? 0.4 : 1,
                  cursor: isEmpty ? 'default' : 'pointer',
                }}
                onClick={() => {
                  if (isEmpty) return
                  const seg = data.find(d => d.name === value)
                  if (seg) onSegmentClick(seg.key)
                }}
              >
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingBottom: 36 }}>
        <span className="text-3xl font-bold text-black dark:text-white leading-none">{total}</span>
        <span className="text-xs text-black/50 dark:text-slate-400 mt-1">projects</span>
      </div>
    </div>
  )
}
