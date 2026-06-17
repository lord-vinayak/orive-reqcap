import React, { useEffect, useId, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { clientService, requirementService, userService } from '@/services'
import type { Client, Requirement, User } from '@/types'
import type { WelcomeEmailResult } from '@/services'
import { LEAD_STATUS_OPTIONS, LEAD_STATUS_LABEL, LEAD_STATUS_COLOR, getSubStatusLabel } from '@/constants/clientStatus'
import type { LeadStatus } from '@/constants/clientStatus'
import { LeadStatusBadge } from '@/components/LeadStatusBadge'
import { BulkEmailModal } from '@/components/BulkEmailModal'
import { BulkStatusModal } from '@/components/BulkStatusModal'
import { PaginationBar } from '@/components/PaginationBar'

type Tab = 'edit' | 'browse'

const TABS: { id: Tab; label: string }[] = [
  { id: 'edit', label: 'Edit Record' },
  { id: 'browse', label: 'Browse Records' },
]

// ── Browse Records tab ────────────────────────────────────────────────────────

const BROWSE_PAGE_SIZE = 50

function BrowseTab() {
  const searchId = useId()
  const dateFromId = useId()
  const dateToId = useId()
  const pocFilterId = useId()
  const statusFilterId = useId()
  const selectAllId = useId()

  // Server-side data
  const [clients, setClients] = useState<Client[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Filters — changes trigger a fresh fetch from page 1
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pocFilter, setPocFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('')

  // Selection — phone_no → Client; persists across page navigation, cleared only on filter change
  const [selectedMap, setSelectedMap] = useState<Map<string, Client>>(new Map())

  // Modals
  const [emailModal, setEmailModal] = useState(false)
  const [statusModal, setStatusModal] = useState(false)
  const [emailResult, setEmailResult] = useState<WelcomeEmailResult | null>(null)

  // Live announce
  const [announcement, setAnnouncement] = useState('')

  // Load users once for the POC filter dropdown
  useEffect(() => {
    userService.list().then((res) => {
      const usersArr: User[] = Array.isArray(res) ? res : (res as any).results ?? []
      setUsers(usersArr)
    })
  }, [])

  // Build API params from current filter state
  const buildParams = (pg: number) => {
    const params: Record<string, string | number> = { page_size: BROWSE_PAGE_SIZE, page: pg }
    if (search.trim()) params.q = search.trim()
    if (pocFilter) params.poc = pocFilter
    if (statusFilter) params.lead_status = statusFilter
    if (dateFrom) params.created_after = dateFrom
    if (dateTo) params.created_before = dateTo
    return params
  }

  // Page navigation — does NOT clear selection
  const fetchPage = async (pg: number) => {
    setLoading(true)
    try {
      const res = await clientService.list(buildParams(pg) as any)
      const raw = Array.isArray(res) ? res : (res as any)
      const list: Client[] = Array.isArray(raw) ? raw : raw.results ?? []
      const count: number = Array.isArray(res) ? list.length : ((res as any).count ?? list.length)
      setClients(list)
      setTotalCount(count)
      setTotalPages(Math.max(1, Math.ceil(count / BROWSE_PAGE_SIZE)))
      setPage(pg)
    } catch {
      setClients([])
      setTotalCount(null)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  // Filter changes → clear selection and reset to page 1
  useEffect(() => {
    setSelectedMap(new Map())
    const timer = setTimeout(() => fetchPage(1), search.trim() ? 300 : 0)
    return () => clearTimeout(timer)
  }, [search, pocFilter, statusFilter, dateFrom, dateTo])

  const isFiltered = !!(search || pocFilter || statusFilter || dateFrom || dateTo)
  const resetFilters = () => {
    setSearch(''); setPocFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo('')
  }

  const toggleSelect = (client: Client) => {
    setSelectedMap((prev) => {
      const next = new Map(prev)
      if (next.has(client.phone_no)) next.delete(client.phone_no)
      else next.set(client.phone_no, client)
      setAnnouncement(`${next.size} client${next.size !== 1 ? 's' : ''} selected`)
      return next
    })
  }

  const toggleAll = () => {
    const allOnPageSelected = clients.every((c) => selectedMap.has(c.phone_no))
    setSelectedMap((prev) => {
      const next = new Map(prev)
      if (allOnPageSelected) {
        clients.forEach((c) => next.delete(c.phone_no))
        setAnnouncement('Current page deselected')
      } else {
        clients.forEach((c) => next.set(c.phone_no, c))
        setAnnouncement(`${next.size} client${next.size !== 1 ? 's' : ''} selected`)
      }
      return next
    })
  }

  const selectedClients = Array.from(selectedMap.values())
  const allPageSelected = clients.length > 0 && clients.every((c) => selectedMap.has(c.phone_no))
  const filtered = clients // filtering is server-side

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const handleEmailDone = (result: WelcomeEmailResult) => {
    setEmailModal(false)
    setEmailResult(result)
    setSelectedMap(new Map())
  }

  const handleStatusDone = (newStatus: LeadStatus, newSubStatus: string) => {
    setClients((prev) =>
      prev.map((c) => selectedMap.has(c.phone_no) ? { ...c, lead_status: newStatus, lead_sub_status: newSubStatus } : c)
    )
    setStatusModal(false)
    setSelectedMap(new Map())
    setAnnouncement('Lead status updated successfully')
  }

  return (
    <div className="space-y-4">
      {/* Live region for screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* ── Filter bar ── */}
      <div
        role="group"
        aria-label="Filter clients"
        className="flex flex-wrap items-end gap-2 p-3 rounded-xl bg-black/3 dark:bg-white/3 border border-black/6 dark:border-white/6"
      >
        {/* Search */}
        <div className="flex flex-col gap-1 min-w-[140px] flex-1">
          <label htmlFor={searchId} className="text-xs font-medium text-black/70 dark:text-slate-300">
            Search
          </label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or phone…"
            className="w-full text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-black dark:text-white placeholder-black/30 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-mustard"
          />
        </div>

        {/* Date from */}
        <div className="flex flex-col gap-1 min-w-[110px]">
          <label htmlFor={dateFromId} className="text-xs font-medium text-black/70 dark:text-slate-300">
            From
          </label>
          <input
            id={dateFromId}
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
          />
        </div>

        {/* Date to */}
        <div className="flex flex-col gap-1 min-w-[110px]">
          <label htmlFor={dateToId} className="text-xs font-medium text-black/70 dark:text-slate-300">
            To
          </label>
          <input
            id={dateToId}
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
          />
        </div>

        {/* POC */}
        <div className="flex flex-col gap-1 min-w-[110px]">
          <label htmlFor={pocFilterId} className="text-xs font-medium text-black/70 dark:text-slate-300">
            Added by
          </label>
          <select
            id={pocFilterId}
            value={pocFilter}
            onChange={(e) => setPocFilter(e.target.value)}
            className="w-full text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
          >
            <option value="">All</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        {/* Lead status */}
        <div className="flex flex-col gap-1 min-w-[130px]">
          <label htmlFor={statusFilterId} className="text-xs font-medium text-black/70 dark:text-slate-300">
            Lead status
          </label>
          <select
            id={statusFilterId}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LeadStatus | '')}
            className="w-full text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
          >
            <option value="">All statuses</option>
            {LEAD_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Reset */}
        <button
          onClick={resetFilters}
          disabled={!isFiltered}
          aria-label="Reset all filters"
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-black/15 dark:border-white/15 text-black/50 dark:text-slate-400 hover:border-red-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors self-end mb-0.5"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      {/* ── Selection toolbar ── */}
      {selectedMap.size > 0 && (
        <div
          role="toolbar"
          aria-label="Selection actions"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-mustard/10 border border-mustard/30"
        >
          <span className="text-sm font-medium text-black dark:text-white">
            {selectedMap.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setEmailModal(true)}
              className="btn-secondary text-sm"
              aria-label={`Send welcome email to ${selectedMap.size} selected clients`}
            >
              ✉ Send Email
            </button>
            <button
              onClick={() => setStatusModal(true)}
              className="btn-secondary text-sm"
              aria-label={`Change lead status for ${selectedMap.size} selected clients`}
            >
              ↕ Change Status
            </button>
            <button
              onClick={() => { setSelectedMap(new Map()); setAnnouncement('Selection cleared') }}
              className="text-sm text-black/60 dark:text-slate-300 hover:text-black dark:hover:text-white underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
              aria-label="Clear selection"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Email result banner ── */}
      {emailResult && (
        <div role="status" aria-live="polite" className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-400 flex items-center justify-between gap-4">
          <span>
            <span aria-hidden="true">✓ </span>
            {emailResult.sent.length} email{emailResult.sent.length !== 1 ? 's' : ''} sent
            {emailResult.skipped.length > 0 && ` · ${emailResult.skipped.length} skipped (no email)`}
          </span>
          <button
            onClick={() => setEmailResult(null)}
            aria-label="Dismiss email result"
            className="text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200 focus-visible:ring-2 focus-visible:ring-mustard rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div role="status" aria-live="polite" className="text-sm text-black/60 dark:text-slate-300">
          Loading clients…
        </div>
      )}

      {/* ── Table ── */}
      {!loading && (
        <>
          <p className="text-xs text-black/50 dark:text-slate-400">
            {totalCount !== null ? `${totalCount} client${totalCount !== 1 ? 's' : ''}` : `${clients.length} client${clients.length !== 1 ? 's' : ''}`}
            {isFiltered ? ' matching filters' : ''}{totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
          </p>

          {clients.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-slate-300 py-6 text-center">
              No clients match the selected filters.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
              <table className="w-full text-sm" aria-label="All clients — browse records">
                <thead>
                  <tr className="bg-black/3 dark:bg-white/3 text-left">
                    <th scope="col" className="px-4 py-3">
                      <input
                        id={selectAllId}
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleAll}
                        aria-label={allPageSelected ? 'Deselect all on this page' : 'Select all on this page'}
                        className="w-4 h-4 accent-mustard cursor-pointer"
                      />
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Name</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white whitespace-nowrap">Phone</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Company</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white whitespace-nowrap">Lead Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white whitespace-nowrap">Sub-status</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Added by</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white whitespace-nowrap">Date Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {filtered.map((c) => (
                    <tr
                      key={c.phone_no}
                      className={`hover:bg-black/1 dark:hover:bg-white/1 transition-colors ${selectedMap.has(c.phone_no) ? 'bg-mustard/5 dark:bg-mustard/10' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedMap.has(c.phone_no)}
                          onChange={() => toggleSelect(c)}
                          aria-label={`Select ${c.name}`}
                          className="w-4 h-4 accent-mustard cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-black dark:text-white">{c.name}</td>
                      <td className="px-4 py-3 text-black/70 dark:text-slate-300 font-mono tabular-nums">{c.phone_no}</td>
                      <td className="px-4 py-3 text-black/70 dark:text-slate-300">{c.company_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${LEAD_STATUS_COLOR[c.lead_status as LeadStatus] ?? ''}`}>
                          {LEAD_STATUS_LABEL[c.lead_status as LeadStatus] ?? c.lead_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-black/60 dark:text-slate-300">
                        {c.lead_sub_status ? getSubStatusLabel(c.lead_sub_status) : '—'}
                      </td>
                      <td className="px-4 py-3 text-black/70 dark:text-slate-300">{c.poc_name || '—'}</td>
                      <td className="px-4 py-3 text-black/60 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        {c.created_at ? fmtDate(c.created_at) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!loading && (
        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
          onPageChange={fetchPage}
          disabled={loading}
        />
      )}

      {/* ── Modals ── */}
      {emailModal && (
        <BulkEmailModal
          clients={selectedClients}
          onClose={() => setEmailModal(false)}
          onDone={handleEmailDone}
        />
      )}
      {statusModal && (
        <BulkStatusModal
          clients={selectedClients}
          onClose={() => setStatusModal(false)}
          onDone={handleStatusDone}
        />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RequirementSearch() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('edit')
  const tabPanelId = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleTabKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let next = -1
    if (e.key === 'ArrowRight') { e.preventDefault(); next = (currentIndex + 1) % TABS.length }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); next = (currentIndex - 1 + TABS.length) % TABS.length }
    else if (e.key === 'Home') { e.preventDefault(); next = 0 }
    else if (e.key === 'End') { e.preventDefault(); next = TABS.length - 1 }
    if (next >= 0) { setActiveTab(TABS[next].id); tabRefs.current[next]?.focus() }
  }

  // ── Edit Record tab state ──────────────────────────────────────────────────
  const [pocFilter, setPocFilter] = useState('')
  const [textFilter, setTextFilter] = useState(() => searchParams.get('phone') ?? '')

  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)

  const [expandedPhone, setExpandedPhone] = useState<string | null>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loadingReqs, setLoadingReqs] = useState(false)
  const [reqError, setReqError] = useState('')

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

  useEffect(() => {
    setLoadingUsers(true)
    userService.list()
      .then((res) => setUsers(Array.isArray(res) ? res : res.results))
      .finally(() => setLoadingUsers(false))
  }, [])

  useEffect(() => { fetchRecentPage(1) }, [])

  useEffect(() => {
    const params: { q?: string; poc?: string } = {}
    if (textFilter.trim()) params.q = textFilter.trim()
    if (pocFilter) params.poc = pocFilter

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
    } catch {
      setReqError('Failed to load requirements.')
    } finally {
      setLoadingReqs(false)
    }
  }

  const hasFilters = Boolean(textFilter.trim() || pocFilter)
  const displayClients = hasFilters ? clients : recentClients

  return (
    <Layout title="Edit Old Requirement">
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Edit Record</h1>

        {/* ── Tab bar ── */}
        <div role="tablist" aria-label="Edit record or browse clients" className="flex gap-1 border-b border-black/10 dark:border-white/10">
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[index] = el }}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tabPanelId}-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors focus-visible:ring-2 focus-visible:ring-mustard focus:outline-none -mb-px ${
                activeTab === tab.id
                  ? 'border-mustard text-mustard'
                  : 'border-transparent text-black/60 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-black/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab panels ── */}
        <div
          role="tabpanel"
          id={`${tabPanelId}-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
        >
          {activeTab === 'edit' && (
            <>
              {/* ---- Filter bar ---- */}
              <div className="card mb-6 flex flex-wrap gap-4 items-end">
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

                          {expandedPhone === c.phone_no && (
                            <tr>
                              <td colSpan={5} className="p-0">
                                <div className="bg-black/[0.015] dark:bg-white/[0.03] px-6 py-4 border-t border-black/5 dark:border-white/5">
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
            </>
          )}

          {activeTab === 'browse' && <BrowseTab />}
        </div>
      </div>
    </Layout>
  )
}
