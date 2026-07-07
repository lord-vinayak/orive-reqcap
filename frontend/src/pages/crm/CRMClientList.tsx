import { useEffect, useState, useId } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { api } from '@/services/api'
import { LeadStatusBadge } from '@/components/LeadStatusBadge'
import { getPipelineLeadStatus, PIPELINE_LEAD_STATUS_LABEL } from '@/constants/clientStatus'
import type { LeadStatus } from '@/constants/clientStatus'

interface Client {
  phone_no: string
  name: string
  company_name: string
  email: string
  city: string
  lead_status: LeadStatus
  lead_sub_status: string
  poc: string | null
}

interface PaginatedClients {
  count: number
  results: Client[]
}

const PAGE_SIZE = 50

export default function CRMClientList() {
  const searchId = useId()
  const [clients, setClients] = useState<Client[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  const fetchClients = (q = '', p = 1) => {
    setLoading(true)
    api.get<PaginatedClients>('/clients/', { params: { ...(q ? { q } : {}), page: p, page_size: PAGE_SIZE } })
      .then((r) => {
        setClients(r.data.results)
        setCount(r.data.count)
        if (q) {
          const found = r.data.count
          setStatusMessage(found > 0 ? `${found} client${found !== 1 ? 's' : ''} found.` : 'No clients found.')
          setTimeout(() => setStatusMessage(''), 3000)
        }
      })
      .catch(() => setError('Failed to load clients.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchClients(search, page) }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchClients(search.trim(), 1)
  }

  return (
    <Layout title="Clients">
      <div className="space-y-6">
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{statusMessage}</div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-black dark:text-white">Clients</h1>
          <Link to="/crm/clients/new" className="btn-primary text-sm" aria-label="Add a new client">
            + Add Client
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} role="search" aria-label="Search clients">
          <div className="flex gap-2">
            <label htmlFor={searchId} className="sr-only">Search by name, phone, or POC</label>
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or POC…"
              className="flex-1 border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
            />
            <button type="submit" className="btn-primary text-sm px-4">Search</button>
            {search && (
              <button
                type="button"
                className="btn-secondary text-sm px-4"
                onClick={() => { setSearch(''); fetchClients() }}
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {error && (
          <div role="alert" className="text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        {loading ? (
          <div role="status" aria-live="polite" aria-atomic="true" className="text-black/60 dark:text-slate-400 text-sm">
            Loading clients…
          </div>
        ) : clients.length === 0 ? (
          <p role="status" aria-live="polite" aria-atomic="true" className="text-black/60 dark:text-slate-400 text-sm">No clients found.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
            <table className="w-full text-sm" aria-label="Client list">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Name</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Company</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Phone</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Project Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Lead Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {clients.map((c) => (
                  <tr key={c.phone_no} className="hover:bg-black/2 dark:hover:bg-white/2">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        to={`/crm/clients/${c.phone_no}`}
                        className="text-black dark:text-white hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-black/70 dark:text-slate-300">{c.company_name || '—'}</td>
                    <td className="px-4 py-3 text-black/70 dark:text-slate-300">{c.phone_no}</td>
                    <td className="px-4 py-3 text-black/70 dark:text-slate-300">
                      {PIPELINE_LEAD_STATUS_LABEL[getPipelineLeadStatus(c.lead_status)]}
                    </td>
                    <td className="px-4 py-3">
                      <LeadStatusBadge
                        client={c}
                        onUpdated={(patch) => setClients((prev) => prev.map((x) => x.phone_no === c.phone_no ? { ...x, ...patch } : x))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/crm/clients/${c.phone_no}`}
                        className="text-mustard hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded text-sm"
                        aria-label={`View details for ${c.name}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {count > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-black/60 dark:text-slate-400" role="status" aria-live="polite">
              Page {page} of {Math.ceil(count / PAGE_SIZE)} · {count} clients
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded border border-black/15 dark:border-white/15 disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-mustard"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(count / PAGE_SIZE) || loading}
                className="px-3 py-1.5 rounded border border-black/15 dark:border-white/15 disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-mustard"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
