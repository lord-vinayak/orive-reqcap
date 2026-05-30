import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import { api } from '@/services/api'
import { crmApi } from '@/services/crm'
import type { CRMProjectList } from '@/types/crm'
import { ProgressBar } from '@/components/crm/ProgressBar'
import { StatusBadge } from '@/components/crm/StatusBadge'

interface Client {
  phone_no: string
  name: string
  company_name: string
  email: string
  city: string
  gst_details: string
  physical_address: string
  status: string
  poc: string | null
}

interface Requirement {
  id: string
  title: string
  status: string
  created_at: string
}

export default function CRMClientDetail() {
  const { phoneNo } = useParams<{ phoneNo: string }>()
  const navigate = useNavigate()

  const [client, setClient] = useState<Client | null>(null)
  const [crmProjects, setCrmProjects] = useState<CRMProjectList[]>([])
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!phoneNo) return
    Promise.all([
      api.get<Client>(`/clients/${phoneNo}/`),
      crmApi.listProjects({ client: phoneNo }),
      api.get<{ results: Requirement[] }>('/requirements/', { params: { client: phoneNo } }),
    ])
      .then(([clientRes, projectsRes, reqRes]) => {
        setClient(clientRes.data)
        setCrmProjects(projectsRes.data.results)
        setRequirements(reqRes.data.results)
      })
      .catch(() => setError('Failed to load client details.'))
      .finally(() => setLoading(false))
  }, [phoneNo])

  const STATUS_LABEL: Record<string, string> = {
    new_lead: 'New Lead – Not Contacted',
    interested_started: 'Interested – Project Started',
    not_interested_closed: 'Not Interested – Closed',
  }

  if (loading) {
    return (
      <Layout title="Client">
        <div role="status" aria-live="polite" className="text-black/60 dark:text-slate-400 text-sm">
          Loading client details…
        </div>
      </Layout>
    )
  }

  if (error || !client) {
    return (
      <Layout title="Client">
        <div role="alert" className="text-red-600 dark:text-red-400 text-sm">
          {error || 'Client not found.'}
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={client.name}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">{client.name}</h1>
            {client.company_name && (
              <p className="text-black/60 dark:text-slate-400 text-sm mt-0.5">{client.company_name}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              to={`/crm/projects/new?client=${client.phone_no}`}
              className="btn-primary text-sm"
              aria-label={`Create a new project for ${client.name}`}
            >
              + New Project
            </Link>
            {/* Cross-link to Requirement Capturing Tool */}
            <Link
              to={`/requirements/search?phone=${client.phone_no}`}
              className="btn-secondary text-sm"
              aria-label={`View requirements for ${client.name} in the Requirement Capturing Tool`}
            >
              View in Req. Tool →
            </Link>
          </div>
        </div>

        {/* Client details */}
        <section aria-labelledby="client-details-heading">
          <h2 id="client-details-heading" className="text-lg font-semibold text-black dark:text-white mb-3">
            Client Details
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            <DetailField label="Phone No" value={client.phone_no} />
            <DetailField label="Email" value={client.email} />
            <DetailField label="City" value={client.city} />
            <DetailField label="GST Details" value={client.gst_details} />
            <DetailField label="Status" value={STATUS_LABEL[client.status] || client.status} />
            {client.physical_address && (
              <div className="col-span-full">
                <DetailField label="Address" value={client.physical_address} />
              </div>
            )}
          </dl>
        </section>

        {/* CRM Projects */}
        <section aria-labelledby="crm-projects-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="crm-projects-heading" className="text-lg font-semibold text-black dark:text-white">
              CRM Projects ({crmProjects.length})
            </h2>
          </div>
          {crmProjects.length === 0 ? (
            <p className="text-black/60 dark:text-slate-400 text-sm">No CRM projects for this client yet.</p>
          ) : (
            <div className="space-y-3">
              {crmProjects.map((p) => (
                <Link
                  key={p.id}
                  to={`/crm/projects/${p.id}`}
                  className="flex items-center gap-4 p-4 rounded border border-black/10 dark:border-white/10 hover:border-mustard focus-visible:ring-2 focus-visible:ring-mustard transition-colors bg-white dark:bg-slate-800"
                  aria-label={`Project ${p.project_no}, stage: ${p.project_stage.replace(/_/g, ' ')}, ${p.progress_percentage}% complete`}
                >
                  <div className="font-medium text-black dark:text-white w-36 shrink-0">{p.project_no}</div>
                  <div className="text-sm text-black/60 dark:text-slate-400 capitalize w-32 shrink-0">
                    {p.project_stage.replace(/_/g, ' ')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <ProgressBar value={p.progress_percentage} size="sm" />
                  </div>
                  <StatusBadge hasDelays={p.has_delays} />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Requirements (from Requirement Capturing Tool) */}
        <section aria-labelledby="requirements-heading">
          <h2 id="requirements-heading" className="text-lg font-semibold text-black dark:text-white mb-3">
            Requirements (Req. Tool) ({requirements.length})
          </h2>
          {requirements.length === 0 ? (
            <p className="text-black/60 dark:text-slate-400 text-sm">No requirements captured yet.</p>
          ) : (
            <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
              <table className="w-full text-sm" aria-label="Requirements for this client">
                <thead>
                  <tr className="bg-black/5 dark:bg-white/5 text-left">
                    <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Title</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Created</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {requirements.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-black dark:text-white">{r.title}</td>
                      <td className="px-4 py-3 text-black/60 dark:text-slate-400 capitalize">{r.status}</td>
                      <td className="px-4 py-3 text-black/60 dark:text-slate-400 text-xs">
                        {new Date(r.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/requirements/${r.id}`}
                          className="text-mustard hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded text-sm"
                          aria-label={`Open requirement: ${r.title}`}
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-black/50 dark:text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-black dark:text-white">{value || '—'}</dd>
    </div>
  )
}
