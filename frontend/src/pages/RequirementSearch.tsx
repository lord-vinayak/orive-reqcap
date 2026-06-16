import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { clientService, requirementService, userService } from '@/services'
import type { Client, Requirement, User } from '@/types'
import { LeadStatusBadge } from '@/components/LeadStatusBadge'
import { PaginationBar } from '@/components/PaginationBar'

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

  // Recent requirements shown when no filter is active
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [recentPage, setRecentPage] = useState(1)
  const [recentTotalPages, setRecentTotalPages] = useState(1)
  const [loadingRecent, setLoadingRecent] = useState(true)

  const PAGE_SIZE = 20

  const fetchRecentPage = (pg: number) => {
    setLoadingRecent(true)
    requirementService.list({ page_size: PAGE_SIZE, page: pg })
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res as any)
        const reqs: Requirement[] = Array.isArray(raw) ? raw : raw.results ?? []
        const count: number = Array.isArray(res) ? reqs.length : ((res as any).count ?? reqs.length)
        // Extract unique clients from this page's requirements
        const seen = new Set<string>()
        const unique: Client[] = []
        for (const r of reqs) {
          if (r.client_data && !seen.has(r.client_data.phone_no)) {
            seen.add(r.client_data.phone_no)
            unique.push(r.client_data)
          }
        }
        setRecentClients(unique)
        setRecentTotalPages(Math.max(1, Math.ceil(count / PAGE_SIZE)))
        setRecentPage(pg)
      })
      .catch(() => {})
      .finally(() => setLoadingRecent(false))
  }

  // Load users list once for POC dropdown
  useEffect(() => {
    setLoadingUsers(true)
    userService.list()
      .then((res) => setUsers(Array.isArray(res) ? res : res.results))
      .finally(() => setLoadingUsers(false))
  }, [])

  // Load page 1 of recent requirements on mount
  useEffect(() => { fetchRecentPage(1) }, [])

  // Live-search clients whenever filters change (debounced slightly)
  useEffect(() => {
    const params: { q?: string; poc?: string } = {}
    if (textFilter.trim()) params.q = textFilter.trim()
    if (pocFilter) params.poc = pocFilter

    // Only fetch if at least one filter is set; otherwise show recent
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
  // When no filter is active, show the recent clients list
  const displayClients = hasFilters ? clients : recentClients

  return (
    <Layout title="Edit Old Requirement">
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
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setPocFilter(''); setTextFilter(''); setClients([]); setExpandedPhone(null) }}
            className="btn-secondary text-sm self-end"
            aria-label="Clear search filters"
          >
            Clear
          </button>
        )}
      </div>

      {/* ---- Status messages ---- */}
      {!hasFilters && loadingRecent && (
        <p className="text-sm text-black/60 dark:text-slate-300" role="status" aria-live="polite">
          Loading recent requirements…
        </p>
      )}

      {!hasFilters && !loadingRecent && recentClients.length === 0 && (
        <p className="text-sm text-black/60 dark:text-slate-300" role="status" aria-live="polite">
          No requirements found. Use the filter above to search.
        </p>
      )}

      {!hasFilters && !loadingRecent && recentClients.length > 0 && (
        <p className="text-xs text-black/60 dark:text-slate-400 mb-3">
          Page {recentPage} of {recentTotalPages} — {recentClients.length} shown
        </p>
      )}

      {hasFilters && loadingClients && (
        <p className="text-sm text-black/60 dark:text-slate-300" role="status" aria-live="polite">Searching…</p>
      )}

      {hasFilters && !loadingClients && clients.length === 0 && (
        <p className="text-sm text-black/60 dark:text-slate-300" role="status" aria-live="polite">No clients found matching those filters.</p>
      )}

      {displayClients.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <table className="table-clean" aria-label={hasFilters ? 'Matching clients' : 'Recently updated clients'}>
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
              {displayClients.map((c) => (
                <React.Fragment key={c.phone_no}>
                  <tr className={expandedPhone === c.phone_no ? 'bg-mustard-50/40 dark:bg-slate-700/40' : ''}>
                    <td className="font-medium">{c.name}</td>
                    <td>{c.phone_no}</td>
                    <td>{c.poc_name || '—'}</td>
                    <td>
                      <LeadStatusBadge
                        client={c}
                        onUpdated={(patch) => {
                          setClients((prev) => prev.map((x) => x.phone_no === c.phone_no ? { ...x, ...patch } : x))
                          setRecentClients((prev) => prev.map((x) => x.phone_no === c.phone_no ? { ...x, ...patch } : x))
                        }}
                      />
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
                    <tr>
                      <td colSpan={5} className="p-0">
                        <div className="bg-black/[0.015] dark:bg-white/[0.03] px-6 py-4 border-t border-black/5 dark:border-white/5">
                          {/* Always show a Create button for this client */}
                          {!loadingReqs && (
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs text-black/70 dark:text-slate-300">
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
                            <p className="text-sm text-black/60 dark:text-slate-300" role="status" aria-live="polite">Loading requirements…</p>
                          )}
                          {reqError && !requirements.length && (
                            <p className="text-sm text-black/60 dark:text-slate-300" role="alert">{reqError}</p>
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
                                    <td><time dateTime={r.updated_at}>{new Date(r.updated_at).toLocaleString()}</time></td>
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
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!hasFilters && recentTotalPages > 1 && (
        <PaginationBar
          currentPage={recentPage}
          totalPages={recentTotalPages}
          onPageChange={fetchRecentPage}
          disabled={loadingRecent}
        />
      )}
    </Layout>
  )
}
