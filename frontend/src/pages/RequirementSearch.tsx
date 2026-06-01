import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { clientService, requirementService, userService } from '@/services'
import type { Client, Requirement, User } from '@/types'
import { CLIENT_STATUS_LABEL, CLIENT_STATUS_COLOR } from '@/constants/clientStatus'

export default function RequirementSearch() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Filter state — initialise textFilter from ?phone= URL param (cross-link from CRM Client page)
  const [pocFilter, setPocFilter] = useState('')
  const [textFilter, setTextFilter] = useState(() => searchParams.get('phone') ?? '')

  // Data
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)

  // Expanded client → show their requirements
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loadingReqs, setLoadingReqs] = useState(false)
  const [reqError, setReqError] = useState('')

  // Load users list once for POC dropdown
  useEffect(() => {
    setLoadingUsers(true)
    userService.list()
      .then((res) => setUsers(Array.isArray(res) ? res : res.results))
      .finally(() => setLoadingUsers(false))
  }, [])

  // Live-search clients whenever filters change (debounced slightly)
  useEffect(() => {
    const params: { q?: string; poc?: string } = {}
    if (textFilter.trim()) params.q = textFilter.trim()
    if (pocFilter) params.poc = pocFilter

    // Only fetch if at least one filter is set; otherwise show nothing
    if (!params.q && !params.poc) {
      setClients([])
      setExpandedPhone(null)
      return
    }

    const timer = setTimeout(async () => {
      setLoadingClients(true)
      try {
        const res = await clientService.list(params)
        setClients(Array.isArray(res) ? res : (res as any).results ?? [])
      } catch {
        setClients([])
      } finally {
        setLoadingClients(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [textFilter, pocFilter])

  // Load requirements when a client row is expanded
  const handleExpandClient = async (phone: string) => {
    if (expandedPhone === phone) {
      setExpandedPhone(null)
      setRequirements([])
      return
    }
    setExpandedPhone(phone)
    setRequirements([])
    setReqError('')
    setLoadingReqs(true)
    try {
      const res = await requirementService.listForClient(phone)
      const list = Array.isArray(res) ? res : (res as any).results ?? []
      setRequirements(list)
      // if (list.length === 0) setReqError('No requirements yet for this client.')
    } catch {
      setReqError('Failed to load requirements.')
    } finally {
      setLoadingReqs(false)
    }
  }

  const hasFilters = Boolean(textFilter.trim() || pocFilter)

  return (
    <Layout title="Edit Requirement">
      <h1 className="text-2xl font-semibold mb-6">Edit Old Requirement</h1>

      {/* ---- Filter bar ---- */}
      <div className="card mb-6 flex flex-wrap gap-4 items-end">
        {/* POC dropdown */}
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label htmlFor="poc-filter" className="text-sm font-medium">
            Filter by POC
          </label>
          <select
            id="poc-filter"
            value={pocFilter}
            onChange={(e) => setPocFilter(e.target.value)}
            className="text-sm"
            aria-label="Filter clients by Point of Contact"
            disabled={loadingUsers}
          >
            <option value="">All POCs</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Name or phone text search */}
        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <label htmlFor="text-filter" className="text-sm font-medium">
            Search by name or phone
          </label>
          <input
            id="text-filter"
            value={textFilter}
            onChange={(e) => setTextFilter(e.target.value)}
            placeholder="Type client name or phone number…"
            className="text-sm"
            aria-label="Search clients by name or phone number"
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setPocFilter(''); setTextFilter(''); setClients([]); setExpandedPhone(null) }}
            className="btn-secondary text-sm self-end"
          >
            Clear
          </button>
        )}
      </div>

      {/* ---- Client list ---- */}
      {!hasFilters && (
        <p className="text-sm text-black/60 dark:text-slate-400">
          Select a POC or type a client name / phone number to search.
        </p>
      )}

      {hasFilters && loadingClients && (
        <p className="text-sm text-black/60 dark:text-slate-400">Searching…</p>
      )}

      {hasFilters && !loadingClients && clients.length === 0 && (
        <p className="text-sm text-black/60 dark:text-slate-400">No clients found matching those filters.</p>
      )}

      {clients.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <table className="table-clean" aria-label="Matching clients">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Phone</th>
                <th scope="col">POC</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Expand</span></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <>
                  <tr key={c.phone_no} className={expandedPhone === c.phone_no ? 'bg-mustard-50/40 dark:bg-slate-700/40' : ''}>
                    <td className="font-medium">{c.name}</td>
                    <td>{c.phone_no}</td>
                    <td>{c.poc_name || '—'}</td>
                    <td>
                      {c.status ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${CLIENT_STATUS_COLOR[c.status as keyof typeof CLIENT_STATUS_COLOR] || 'bg-black/5 text-black/60 border-black/10'}`}>
                          {CLIENT_STATUS_LABEL[c.status as keyof typeof CLIENT_STATUS_LABEL] || c.status}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <button
                        onClick={() => handleExpandClient(c.phone_no)}
                        className="btn-secondary text-xs"
                        aria-expanded={expandedPhone === c.phone_no}
                        aria-label={`${expandedPhone === c.phone_no ? 'Collapse' : 'Expand'} requirements for ${c.name}`}
                      >
                        {expandedPhone === c.phone_no ? 'Collapse ▲' : 'View requirements ▼'}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded requirements sub-rows */}
                  {expandedPhone === c.phone_no && (
                    <tr key={`${c.phone_no}-reqs`}>
                      <td colSpan={6} className="p-0">
                        <div className="bg-black/[0.015] dark:bg-white/[0.03] px-6 py-4 border-t border-black/5 dark:border-white/5">
                          {/* Always show a Create button for this client */}
                          {!loadingReqs && (
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs text-black/50 dark:text-slate-500">
                                {requirements.length > 0
                                  ? `${requirements.length} requirement${requirements.length !== 1 ? 's' : ''}`
                                  : 'No requirements yet'}
                              </span>
                              <button
                                onClick={() => navigate(`/requirements/new?client=${c.phone_no}`)}
                                className="btn-primary text-xs py-1 px-3"
                                aria-label={`Create a new requirement for ${c.name}`}
                              >
                                + New Requirement
                              </button>
                            </div>
                          )}
                          {loadingReqs && (
                            <p className="text-sm text-black/60 dark:text-slate-400">Loading requirements…</p>
                          )}
                          {reqError && !requirements.length && (
                            <p className="text-sm text-black/60 dark:text-slate-400">{reqError}</p>
                          )}
                          {!loadingReqs && requirements.length > 0 && (
                            <table className="table-clean" aria-label={`Requirements for ${c.name}`}>
                              <thead>
                                <tr>
                                  <th scope="col">Title</th>
                                  <th scope="col">Status</th>
                                  <th scope="col"># Products</th>
                                  <th scope="col">Last updated</th>
                                  <th scope="col"><span className="sr-only">Actions</span></th>
                                </tr>
                              </thead>
                              <tbody>
                                {requirements.map((r) => (
                                  <tr key={r.id}>
                                    <td>{r.title}</td>
                                    <td><span className="badge">{r.status}</span></td>
                                    <td>{r.no_of_products ?? '—'}</td>
                                    <td>{new Date(r.updated_at).toLocaleString()}</td>
                                    <td>
                                      <button
                                        onClick={() => navigate(`/requirements/${r.id}/view`)}
                                        className="btn-secondary text-sm"
                                        aria-label={`View requirement: ${r.title}`}
                                      >
                                        View
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
