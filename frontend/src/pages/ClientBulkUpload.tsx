import React, { useEffect, useId, useRef, useState } from 'react'
import Layout from '@/components/Layout'
import { clientService, userService } from '@/services'
import type { BulkUploadResult } from '@/services'
import type { WelcomeEmailResult } from '@/services'
import type { Client, User } from '@/types'
import { LEAD_STATUS_OPTIONS, LEAD_STATUS_LABEL, LEAD_STATUS_COLOR, getSubStatusLabel } from '@/constants/clientStatus'
import type { LeadStatus } from '@/constants/clientStatus'
import { BulkEmailModal } from '@/components/BulkEmailModal'
import { BulkStatusModal } from '@/components/BulkStatusModal'

type Tab = 'import' | 'browse'

// ── Import tab ────────────────────────────────────────────────────────────────

function ImportTab() {
  const fileInputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<BulkUploadResult | null>(null)
  const [error, setError] = useState('')
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setResult(null)
    setError('')
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setResult(null)
    setError('')
    try {
      const res = await clientService.bulkUpload(file)
      setResult(res)
      if (inputRef.current) inputRef.current.value = ''
      setFile(null)
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Upload failed. Please try again.'
      setError(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      await clientService.downloadTemplate()
    } catch {
      setError('Could not download template.')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <p className="text-sm text-black/60 dark:text-slate-300">
        Upload a <code className="bg-black/5 dark:bg-white/10 px-1 rounded">.xlsx</code> file to bulk-create clients.
        The logged-in user is automatically set as the POC for all imported clients.
      </p>

      {/* ── Column reference ── */}
      <section aria-labelledby="columns-heading" className="bg-black/3 dark:bg-white/3 border border-black/10 dark:border-white/10 rounded-lg p-4 text-sm space-y-2">
        <h2 id="columns-heading" className="font-semibold text-black dark:text-white">Expected columns</h2>
        <table className="w-full text-xs" aria-label="Required and optional column names">
          <thead>
            <tr className="text-left text-black/70 dark:text-slate-300 border-b border-black/10 dark:border-white/10">
              <th scope="col" className="pb-1 pr-4 font-semibold">Column name (header row)</th>
              <th scope="col" className="pb-1 pr-4 font-semibold">Required?</th>
              <th scope="col" className="pb-1 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {[
              ['full_name',    'Required', 'Client\'s full name'],
              ['phone_number', 'Required', 'Any format containing 10 digits, e.g. p:+919876543210'],
              ['email',        'Optional', 'Stored as-is; invalid emails are flagged with a warning'],
              ['company_name', 'Optional', ''],
              ['city',         'Optional', ''],
              ['lead_status',  'Optional', 'Initial Conversation · Product Requirement Captured · Proposal · Costing · Sample · Order · Production · Testing · Filling · Order Dispatch · Order Closed · On Hold · Lead Closed  (defaults to Initial Conversation)'],
              ['sub_status',   'Optional', 'Sub-status matching the lead_status column, e.g. "Formula Created" when lead_status is "Sample"'],
            ].map(([col, req, note]) => (
              <tr key={col}>
                <td className="py-1.5 pr-4 font-mono text-black dark:text-white">{col}</td>
                <td className={`py-1.5 pr-4 font-medium ${req === 'Required' ? 'text-red-600 dark:text-red-400' : 'text-black/70 dark:text-slate-300'}`}>{req}</td>
                <td className="py-1.5 text-black/60 dark:text-slate-300">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-black/70 dark:text-slate-300 pt-1">
          Rows with an existing phone number, missing name, or unreadable phone are skipped and shown in the Skipped section below.
        </p>
      </section>

      {/* ── Actions ── */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[240px]">
          <label htmlFor={fileInputId} className="block text-sm font-medium text-black dark:text-white mb-1">
            Select Excel file
          </label>
          <input
            id={fileInputId}
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-black dark:text-white file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-mustard file:text-black hover:file:bg-mustard/80 cursor-pointer"
            aria-label="Select an Excel file to upload"
          />
          {file && (
            <p className="text-xs text-black/70 dark:text-slate-300 mt-1" aria-live="polite">
              Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>
        <button onClick={handleUpload} disabled={!file || uploading} className="btn-primary" aria-busy={uploading}>
          {uploading ? 'Importing…' : 'Import Clients'}
        </button>
        <button onClick={handleDownloadTemplate} disabled={downloadingTemplate} className="btn-secondary text-sm" aria-label="Download blank Excel template">
          {downloadingTemplate ? 'Downloading…' : '↓ Download Template'}
        </button>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="space-y-6" aria-live="polite" aria-label="Import results">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[140px] p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">{result.created.length}</div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-0.5">Clients created</div>
            </div>
            <div className="flex-1 min-w-[140px] p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">{result.skipped.length}</div>
              <div className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">Rows skipped</div>
            </div>
          </div>

          {result.created.length > 0 && (
            <section aria-labelledby="created-heading">
              <h2 id="created-heading" className="text-base font-semibold text-black dark:text-white mb-2">
                <span aria-hidden="true">✓</span> Created ({result.created.length})
              </h2>
              <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
                <table className="w-full text-sm" aria-label="Successfully created clients">
                  <thead>
                    <tr className="bg-black/5 dark:bg-white/5 text-left">
                      <th scope="col" className="px-3 py-2 font-semibold text-black/60 dark:text-slate-300">Row</th>
                      <th scope="col" className="px-3 py-2 font-semibold text-black/60 dark:text-slate-300">Name</th>
                      <th scope="col" className="px-3 py-2 font-semibold text-black/60 dark:text-slate-300">Phone</th>
                      <th scope="col" className="px-3 py-2 font-semibold text-black/60 dark:text-slate-300">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {result.created.map((r) => (
                      <tr key={r.row}>
                        <td className="px-3 py-2 text-black/70 dark:text-slate-300 tabular-nums">{r.row}</td>
                        <td className="px-3 py-2 text-black dark:text-white font-medium">{r.name}</td>
                        <td className="px-3 py-2 text-black/70 dark:text-slate-300 font-mono">{r.phone}</td>
                        <td className="px-3 py-2 text-amber-600 dark:text-amber-400 text-xs">{r.warning ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {result.skipped.length > 0 && (
            <section aria-labelledby="skipped-heading">
              <h2 id="skipped-heading" className="text-base font-semibold text-black dark:text-white mb-2">
                <span aria-hidden="true">⚠</span> Skipped ({result.skipped.length})
              </h2>
              <div className="overflow-x-auto rounded border border-amber-200 dark:border-amber-800">
                <table className="w-full text-sm" aria-label="Skipped rows with reasons">
                  <thead>
                    <tr className="bg-amber-50 dark:bg-amber-900/20 text-left">
                      <th scope="col" className="px-3 py-2 font-semibold text-amber-700 dark:text-amber-400">Row</th>
                      <th scope="col" className="px-3 py-2 font-semibold text-amber-700 dark:text-amber-400">Name</th>
                      <th scope="col" className="px-3 py-2 font-semibold text-amber-700 dark:text-amber-400">Phone</th>
                      <th scope="col" className="px-3 py-2 font-semibold text-amber-700 dark:text-amber-400">Reason skipped</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
                    {result.skipped.map((r) => (
                      <tr key={r.row}>
                        <td className="px-3 py-2 text-black/70 dark:text-slate-300 tabular-nums">{r.row}</td>
                        <td className="px-3 py-2 text-black dark:text-white">{r.name}</td>
                        <td className="px-3 py-2 text-black/70 dark:text-slate-300 font-mono">{r.phone}</td>
                        <td className="px-3 py-2 text-red-600 dark:text-red-400">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {result.created.length > 0 && result.skipped.length === 0 && (
            <p className="text-sm text-green-700 dark:text-green-400 font-medium" role="status">
              All rows imported successfully — no errors.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Browse Records tab ────────────────────────────────────────────────────────

function BrowseTab() {
  const searchId = useId()
  const dateFromId = useId()
  const dateToId = useId()
  const pocFilterId = useId()
  const statusFilterId = useId()
  const selectAllId = useId()

  const [allClients, setAllClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Filters (client-side)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pocFilter, setPocFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('')

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Modals
  const [emailModal, setEmailModal] = useState(false)
  const [statusModal, setStatusModal] = useState(false)
  const [emailResult, setEmailResult] = useState<WelcomeEmailResult | null>(null)

  // Live announce
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    Promise.all([
      clientService.list({ page_size: 500 }),
      userService.list(),
    ]).then(([clientRes, userRes]) => {
      const clients: Client[] = Array.isArray(clientRes) ? clientRes : (clientRes as any).results ?? []
      const usersArr: User[] = Array.isArray(userRes) ? userRes : (userRes as any).results ?? []
      setAllClients(clients)
      setUsers(usersArr)
    }).finally(() => setLoading(false))
  }, [])

  // Client-side filtering
  const filtered = allClients.filter((c) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!c.name.toLowerCase().includes(q) && !c.phone_no.includes(q)) return false
    }
    if (pocFilter && c.poc !== pocFilter) return false
    if (statusFilter && c.lead_status !== statusFilter) return false
    if (dateFrom && c.created_at) {
      if (c.created_at.slice(0, 10) < dateFrom) return false
    }
    if (dateTo && c.created_at) {
      if (c.created_at.slice(0, 10) > dateTo) return false
    }
    return true
  })

  const isFiltered = !!(search || pocFilter || statusFilter || dateFrom || dateTo)
  const resetFilters = () => {
    setSearch(''); setPocFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo('')
  }

  const toggleSelect = (phone: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(phone)) next.delete(phone); else next.add(phone)
      setAnnouncement(`${next.size} client${next.size !== 1 ? 's' : ''} selected`)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set())
      setAnnouncement('All clients deselected')
    } else {
      const next = new Set(filtered.map((c) => c.phone_no))
      setSelected(next)
      setAnnouncement(`All ${next.size} clients selected`)
    }
  }

  const selectedClients = allClients.filter((c) => selected.has(c.phone_no))
  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.phone_no))

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const handleEmailDone = (result: WelcomeEmailResult) => {
    setEmailModal(false)
    setEmailResult(result)
    setSelected(new Set())
  }

  const handleStatusDone = (newStatus: LeadStatus, newSubStatus: string) => {
    setAllClients((prev) =>
      prev.map((c) => selected.has(c.phone_no) ? { ...c, lead_status: newStatus, lead_sub_status: newSubStatus } : c)
    )
    setStatusModal(false)
    setSelected(new Set())
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

        {/* Reset — icon-only button, inline with the other fields */}
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
      {selected.size > 0 && (
        <div
          role="toolbar"
          aria-label="Selection actions"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-mustard/10 border border-mustard/30"
        >
          <span className="text-sm font-medium text-black dark:text-white">
            {selected.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setEmailModal(true)}
              className="btn-secondary text-sm"
              aria-label={`Send welcome email to ${selected.size} selected clients`}
            >
              ✉ Send Email
            </button>
            <button
              onClick={() => setStatusModal(true)}
              className="btn-secondary text-sm"
              aria-label={`Change lead status for ${selected.size} selected clients`}
            >
              ↕ Change Status
            </button>
            <button
              onClick={() => { setSelected(new Set()); setAnnouncement('Selection cleared') }}
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
            {filtered.length} client{filtered.length !== 1 ? 's' : ''}
            {isFiltered ? ' matching filters' : ' total'}
          </p>

          {filtered.length === 0 ? (
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
                        checked={allFilteredSelected}
                        onChange={toggleAll}
                        aria-label={allFilteredSelected ? 'Deselect all clients' : 'Select all clients'}
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
                      className={`hover:bg-black/1 dark:hover:bg-white/1 transition-colors ${selected.has(c.phone_no) ? 'bg-mustard/5 dark:bg-mustard/10' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(c.phone_no)}
                          onChange={() => toggleSelect(c.phone_no)}
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

const TABS: { id: Tab; label: string }[] = [
  { id: 'import', label: 'Import from Excel' },
  { id: 'browse', label: 'Browse Records' },
]

export default function ClientBulkUpload() {
  const [activeTab, setActiveTab] = useState<Tab>('import')
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

  return (
    <Layout title="Import Clients">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-black dark:text-white">Import &amp; Browse Clients</h1>

        {/* ── Tab bar ── */}
        <div role="tablist" aria-label="Import or browse clients" className="flex gap-1 border-b border-black/10 dark:border-white/10">
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
          {activeTab === 'import' && <ImportTab />}
          {activeTab === 'browse' && <BrowseTab />}
        </div>
      </div>
    </Layout>
  )
}
