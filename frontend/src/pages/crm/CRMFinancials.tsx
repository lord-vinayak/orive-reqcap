import React, { useEffect, useId, useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import { crmApi } from '@/services/crm'
import type { ProjectPayment } from '@/types/crm'

type TableView = 'all' | 'by_project' | 'by_vendor'

const SUB_TYPE_LABEL: Record<string, string> = {
  manufacturing: 'Manufacturing', logistics: 'Logistics',
  derma_testing: 'Derma Testing', batch_testing: 'Batch Testing',
  packaging: 'Packaging', printing: 'Printing',
  samples: 'Samples', sample: 'Sample', production: 'Production',
  design: 'Design', testing: 'Testing', others: 'Others',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
function firstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CRMFinancials() {
  const [dateFrom, setDateFrom] = useState(firstOfMonth())
  const [dateTo, setDateTo] = useState(today())
  const [payments, setPayments] = useState<ProjectPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tableView, setTableView] = useState<TableView>('all')
  const [txSearch, setTxSearch] = useState('')
  const [txDirection, setTxDirection] = useState<'all' | 'received' | 'paid' | 'receivable' | 'payable'>('all')
  const [txCategory, setTxCategory] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [vendorSearch, setVendorSearch] = useState('')
  const [pendingModal, setPendingModal] = useState<'payable' | 'receivable' | null>(null)

  const handleDrillDown = (searchValue: string) => {
    setTxSearch(searchValue)
    setTableView('all')
  }

  useEffect(() => {
    if (!dateFrom || !dateTo) return
    setLoading(true)
    setError('')
    crmApi.listProjectPayments_range(dateFrom, dateTo)
      .then(setPayments)
      .catch(() => setError('Failed to load payments.'))
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo])

  // ── Aggregations ────────────────────────────────────────────────────────────

  const { totalCredits, totalDebits, totalPayable, totalReceivable, netPL } = useMemo(() => {
    let credits = 0, debits = 0, payable = 0, receivable = 0
    for (const p of payments) {
      const amt = parseFloat(p.amount) || 0
      if (p.direction === 'received') credits += amt
      else if (p.direction === 'paid') debits += amt
      else if (p.direction === 'payable' && !p.is_settled) payable += amt
      else if (p.direction === 'receivable' && !p.is_settled) receivable += amt
    }
    return { totalCredits: credits, totalDebits: debits, totalPayable: payable, totalReceivable: receivable, netPL: credits - debits }
  }, [payments])

  // Profit/Loss as a % of total credits (revenue). null when there are no credits.
  const plPercent = totalCredits > 0 ? (netPL / totalCredits) * 100 : null

  const categoryRows = useMemo(() => {
    const map: Record<string, { credits: number; debits: number }> = {}
    for (const p of payments) {
      if (p.direction !== 'paid' && p.direction !== 'received') continue
      const key = p.sub_type_display || SUB_TYPE_LABEL[p.sub_type] || p.sub_type
      if (!map[key]) map[key] = { credits: 0, debits: 0 }
      const amt = parseFloat(p.amount) || 0
      if (p.direction === 'received') map[key].credits += amt
      else map[key].debits += amt
    }
    return Object.entries(map)
      .map(([label, v]) => ({ label, ...v, net: v.credits - v.debits }))
      .sort((a, b) => Math.abs(b.credits + b.debits) - Math.abs(a.credits + a.debits))
  }, [payments])

  const projectRows = useMemo(() => {
    const map: Record<string, { no: string; client: string; credits: number; debits: number }> = {}
    for (const p of payments) {
      if (p.direction !== 'paid' && p.direction !== 'received') continue
      if (!p.project) continue
      if (!map[p.project]) map[p.project] = { no: p.project_no ?? '', client: p.project_client_name ?? '', credits: 0, debits: 0 }
      const amt = parseFloat(p.amount) || 0
      if (p.direction === 'received') map[p.project].credits += amt
      else map[p.project].debits += amt
    }
    return Object.values(map)
      .map((v) => ({ ...v, net: v.credits - v.debits }))
      .sort((a, b) => b.net - a.net)
  }, [payments])

  const vendorRows = useMemo(() => {
    const map: Record<string, { label: string; credits: number; debits: number }> = {}
    for (const p of payments) {
      if (p.direction !== 'paid' && p.direction !== 'received') continue
      const key = p.manufacturer ?? p.vendor ?? '__none__'
      const label = p.manufacturer_name ?? p.vendor_name ?? '(No vendor)'
      if (!map[key]) map[key] = { label, credits: 0, debits: 0 }
      const amt = parseFloat(p.amount) || 0
      if (p.direction === 'received') map[key].credits += amt
      else map[key].debits += amt
    }
    return Object.values(map)
      .map((v) => ({ ...v, net: v.credits - v.debits }))
      .sort((a, b) => Math.abs(b.credits + b.debits) - Math.abs(a.credits + a.debits))
  }, [payments])

  const allTxCategories = useMemo(() => {
    const seen = new Set<string>()
    for (const p of payments) {
      if (p.direction !== 'paid' && p.direction !== 'received') continue
      seen.add(p.sub_type_display || SUB_TYPE_LABEL[p.sub_type] || p.sub_type)
    }
    return [...seen].sort()
  }, [payments])

  const filteredTxPayments = useMemo(() => {
    const q = txSearch.toLowerCase().trim()
    return payments.filter((p) => {
      if (txDirection !== 'all' && p.direction !== txDirection) return false
      if (txCategory) {
        const cat = p.sub_type_display || SUB_TYPE_LABEL[p.sub_type] || p.sub_type
        if (cat !== txCategory) return false
      }
      if (q) {
        const haystack = [
          p.project_no, p.project_client_name, ...p.client_names,
          p.manufacturer_name ?? '', p.vendor_name ?? '',
          p.sub_type_display || SUB_TYPE_LABEL[p.sub_type] || p.sub_type,
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [payments, txSearch, txDirection, txCategory])

  const filteredProjectRows = useMemo(() => {
    const q = projectSearch.toLowerCase().trim()
    if (!q) return projectRows
    return projectRows.filter((r) =>
      `${r.no} ${r.client}`.toLowerCase().includes(q)
    )
  }, [projectRows, projectSearch])

  const filteredVendorRows = useMemo(() => {
    const q = vendorSearch.toLowerCase().trim()
    if (!q) return vendorRows
    return vendorRows.filter((r) =>
      r.label.toLowerCase().includes(q)
    )
  }, [vendorRows, vendorSearch])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Layout title="Net P&L">
      <div className="space-y-8">

        {/* Title + date range */}
        <div className="flex flex-wrap items-end gap-4 justify-between">
          <h1 className="text-2xl font-bold text-black dark:text-white">Net P&L</h1>
          <div className="flex items-end gap-3 flex-wrap">
            <DateField label="From" value={dateFrom} onChange={setDateFrom} />
            <DateField label="To" value={dateTo} onChange={setDateTo} />
          </div>
        </div>

        {error && (
          <div role="alert" className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div role="status" aria-live="polite" className="text-black/60 dark:text-slate-300 text-sm">Loading…</div>
        ) : (
          <>
            {/* ── Summary cards ── */}
            <section aria-labelledby="summary-heading">
              <h2 id="summary-heading" className="sr-only">Financial summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard label="Total Credits" amount={totalCredits} color="green" />
                <SummaryCard label="Total Debits" amount={totalDebits} color="red" />
                <SummaryCard
                  label="Net P&L"
                  amount={netPL}
                  color={netPL >= 0 ? 'green' : 'red'}
                  bold
                  subtext={plPercent === null
                    ? undefined
                    : `${plPercent >= 0 ? '+' : ''}${plPercent.toFixed(2)}% ${plPercent >= 0 ? 'profit' : 'loss'} margin`}
                />
              </div>
            </section>

            {/* ── Pending summary ── */}
            {(totalPayable > 0 || totalReceivable > 0) && (
              <section aria-labelledby="pending-heading">
                <h2 id="pending-heading" className="text-sm font-semibold text-black/60 dark:text-slate-400 uppercase tracking-wide mb-3">
                  Pending
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPendingModal('payable')}
                    className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 p-4 text-left hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors focus-visible:ring-2 focus-visible:ring-mustard"
                    aria-label="View payable breakdown"
                  >
                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">Payable <span className="opacity-60 text-xs font-normal">· click to view</span></p>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{fmt(totalPayable)}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingModal('receivable')}
                    className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/10 p-4 text-left hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors focus-visible:ring-2 focus-visible:ring-mustard"
                    aria-label="View receivable breakdown"
                  >
                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Receivable <span className="opacity-60 text-xs font-normal">· click to view</span></p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{fmt(totalReceivable)}</p>
                  </button>
                </div>
              </section>
            )}

            {pendingModal && (
              <PendingModal
                direction={pendingModal}
                payments={payments.filter((p) => p.direction === pendingModal && !p.is_settled)}
                onClose={() => setPendingModal(null)}
              />
            )}

            {/* ── Category breakdown ── */}
            <section aria-labelledby="category-heading">
              <h2 id="category-heading" className="text-lg font-semibold text-black dark:text-white mb-3">
                By Category
              </h2>
              {categoryRows.length === 0 ? (
                <Empty />
              ) : (
                <BreakdownTable
                  rows={categoryRows.map((r) => ({ label: r.label, credits: r.credits, debits: r.debits, net: r.net }))}
                  firstColLabel="Category"
                />
              )}
            </section>

            {/* ── Project breakdown ── */}
            <section aria-labelledby="project-heading">
              <h2 id="project-heading" className="text-lg font-semibold text-black dark:text-white mb-3">
                By Project
              </h2>
              {projectRows.length === 0 ? (
                <Empty />
              ) : (
                <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
                  <table className="w-full text-sm" aria-label="Breakdown by project">
                    <thead>
                      <tr className="bg-black/5 dark:bg-white/5 text-left">
                        <Th>Project</Th>
                        <Th>Client</Th>
                        <Th right>Credits</Th>
                        <Th right>Debits</Th>
                        <Th right>Net</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {projectRows.map((r) => (
                        <tr key={r.no} className="hover:bg-black/2 dark:hover:bg-white/2">
                          <td className="px-4 py-2 font-medium text-black dark:text-white">{r.no}</td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => handleDrillDown(r.client)}
                              className="text-black/70 dark:text-slate-300 hover:text-mustard hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard rounded text-left"
                              title={`Show all transactions for ${r.client}`}
                            >
                              {r.client}
                            </button>
                          </td>
                          <Td right green>{fmt(r.credits)}</Td>
                          <Td right red>{fmt(r.debits)}</Td>
                          <Td right colored={r.net}>{fmt(r.net)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── Transaction table ── */}
            <section aria-labelledby="transactions-heading">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 id="transactions-heading" className="text-lg font-semibold text-black dark:text-white">
                  Transactions
                </h2>
                <div className="flex rounded border border-black/10 dark:border-white/10 overflow-hidden text-sm" role="toolbar" aria-label="Transaction view">
                  {(['all', 'by_project', 'by_vendor'] as TableView[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setTableView(v)}
                      className={`px-3 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard ${
                        tableView === v
                          ? 'bg-mustard text-black font-medium'
                          : 'bg-white dark:bg-slate-800 text-black/60 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      aria-pressed={tableView === v}
                    >
                      {v === 'all' ? 'All Rows' : v === 'by_project' ? 'By Project' : 'By Vendor'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search / filter bar */}
              {tableView === 'all' && (
                <div className="flex flex-wrap gap-2 mb-3">
                  <input
                    type="search"
                    placeholder="Search project, client, vendor, category…"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    aria-label="Search transactions"
                    className="flex-1 min-w-48 border border-black/20 dark:border-white/20 rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
                  />
                  <select
                    value={txDirection}
                    onChange={(e) => setTxDirection(e.target.value as typeof txDirection)}
                    aria-label="Filter by direction"
                    className="border border-black/20 dark:border-white/20 rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
                  >
                    <option value="all">All directions</option>
                    <option value="received">Credit</option>
                    <option value="paid">Debit</option>
                    <option value="receivable">Receivable</option>
                    <option value="payable">Payable</option>
                  </select>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    aria-label="Filter by category"
                    className="border border-black/20 dark:border-white/20 rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
                  >
                    <option value="">All categories</option>
                    {allTxCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {(txSearch || txDirection !== 'all' || txCategory) && (
                    <button
                      onClick={() => { setTxSearch(''); setTxDirection('all'); setTxCategory('') }}
                      className="px-3 py-1.5 text-sm rounded border border-black/20 dark:border-white/20 text-black/60 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard"
                      aria-label="Clear filters"
                    >
                      Clear
                    </button>
                  )}
                  {(txSearch || txDirection !== 'all' || txCategory) && (
                    <span className="self-center text-xs text-black/50 dark:text-slate-400">
                      {filteredTxPayments.length} result{filteredTxPayments.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
              {tableView === 'by_project' && (
                <div className="flex flex-wrap gap-2 mb-3">
                  <input
                    type="search"
                    placeholder="Search project or client…"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    aria-label="Search projects"
                    className="flex-1 min-w-48 border border-black/20 dark:border-white/20 rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
                  />
                  {projectSearch && (
                    <span className="self-center text-xs text-black/50 dark:text-slate-400">
                      {filteredProjectRows.length} result{filteredProjectRows.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
              {tableView === 'by_vendor' && (
                <div className="flex flex-wrap gap-2 mb-3">
                  <input
                    type="search"
                    placeholder="Search vendor or manufacturer…"
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    aria-label="Search vendors"
                    className="flex-1 min-w-48 border border-black/20 dark:border-white/20 rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
                  />
                  {vendorSearch && (
                    <span className="self-center text-xs text-black/50 dark:text-slate-400">
                      {filteredVendorRows.length} result{filteredVendorRows.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}

              {payments.length === 0 ? <Empty /> : tableView === 'all' ? (
                <AllRowsTable payments={filteredTxPayments} />
              ) : tableView === 'by_project' ? (
                <BreakdownTable
                  rows={filteredProjectRows.map((r) => ({ label: `${r.no} · ${r.client}`, clickValue: r.client, credits: r.credits, debits: r.debits, net: r.net }))}
                  firstColLabel="Project"
                  onLabelClick={handleDrillDown}
                />
              ) : (
                <BreakdownTable
                  rows={filteredVendorRows.map((r) => ({ label: r.label, clickValue: r.label, credits: r.credits, debits: r.debits, net: r.net }))}
                  firstColLabel="Vendor / Manufacturer"
                  onLabelClick={handleDrillDown}
                />
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-black/60 dark:text-slate-300 mb-1">{label}</label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-black/20 dark:border-white/20 rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
      />
    </div>
  )
}

function SummaryCard({ label, amount, color, bold, subtext }: { label: string; amount: number; color: 'green' | 'red'; bold?: boolean; subtext?: string }) {
  const colorClass = color === 'green' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  return (
    <div className="bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-lg p-4">
      <div className={`${bold ? 'text-2xl' : 'text-xl'} font-bold ${colorClass}`}>
        {fmt(amount)}
      </div>
      <div className="text-sm text-black/60 dark:text-slate-300 mt-1">{label}</div>
      {subtext && <div className={`text-sm font-medium mt-0.5 ${colorClass}`}>{subtext}</div>}
    </div>
  )
}

function BreakdownTable({ rows, firstColLabel, onLabelClick }: {
  rows: { label: string; clickValue?: string; credits: number; debits: number; net: number }[]
  firstColLabel: string
  onLabelClick?: (value: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
      <table className="w-full text-sm" aria-label={`Breakdown by ${firstColLabel}`}>
        <thead>
          <tr className="bg-black/5 dark:bg-white/5 text-left">
            <Th>{firstColLabel}</Th>
            <Th right>Credits</Th>
            <Th right>Debits</Th>
            <Th right>Net</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 dark:divide-white/5">
          {rows.map((r) => (
            <tr key={r.label} className="hover:bg-black/2 dark:hover:bg-white/2">
              <td className="px-4 py-2 text-black dark:text-white">
                {onLabelClick && r.clickValue ? (
                  <button
                    type="button"
                    onClick={() => onLabelClick(r.clickValue!)}
                    className="hover:text-mustard hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard rounded text-left"
                    title={`Show all transactions for ${r.clickValue}`}
                  >
                    {r.label}
                  </button>
                ) : r.label}
              </td>
              <Td right green>{fmt(r.credits)}</Td>
              <Td right red>{fmt(r.debits)}</Td>
              <Td right colored={r.net}>{fmt(r.net)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AllRowsTable({ payments }: { payments: ProjectPayment[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const sorted = [...payments].sort((a, b) => b.payment_date.localeCompare(a.payment_date))
  return (
    <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
      <table className="w-full text-sm" aria-label="All payment rows">
        <thead>
          <tr className="bg-black/5 dark:bg-white/5 text-left">
            <Th>Date</Th>
            <Th>Project</Th>
            <Th>Client</Th>
            <Th>Category</Th>
            <Th>Vendor / Manufacturer</Th>
            <Th>Direction</Th>
            <Th right>Amount</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 dark:divide-white/5">
          {sorted.map((p) => (
            <React.Fragment key={p.id}>
              <tr
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                className="hover:bg-black/2 dark:hover:bg-white/2 cursor-pointer"
                aria-expanded={expandedId === p.id}
              >
                <td className="px-4 py-2 text-black/70 dark:text-slate-300 whitespace-nowrap">{p.payment_date}</td>
                <td className="px-4 py-2 font-medium text-black dark:text-white">{p.project_no}</td>
                <td className="px-4 py-2 text-black/70 dark:text-slate-300">
                  {p.project_client_name || (p.client_names.length > 0 ? p.client_names.join(', ') : '—')}
                </td>
                <td className="px-4 py-2 text-black/70 dark:text-slate-300">{p.sub_type_display || SUB_TYPE_LABEL[p.sub_type] || p.sub_type}</td>
                <td className="px-4 py-2 text-black/70 dark:text-slate-300">{p.manufacturer_name ?? p.vendor_name ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    p.direction === 'received' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : p.direction === 'paid' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : p.direction === 'receivable' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {p.direction === 'received' ? 'Credit' : p.direction === 'paid' ? 'Debit' : p.direction === 'receivable' ? 'Receivable' : 'Payable'}
                  </span>
                </td>
                <td className={`px-4 py-2 text-right font-medium ${
                  p.direction === 'received' ? 'text-green-600 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                }`}>
                  <span className="mr-2 text-black/30 dark:text-slate-500 text-xs select-none">
                    {expandedId === p.id ? '▼' : '▶'}
                  </span>
                  {fmt(parseFloat(p.amount) || 0)}
                </td>
              </tr>
              {expandedId === p.id && (
                <tr className="bg-mustard/5 dark:bg-mustard/10">
                  <td colSpan={7} className="px-6 py-4 space-y-3">
                    {/* First line: Invoice, Added by, Settlement (pending only), Created at */}
                    <dl className="grid grid-flow-col auto-cols-fr gap-x-8 gap-y-3 text-sm w-full">
                      <DetailField
                        label="Invoice"
                        value={p.invoice_filename || null}
                        href={p.invoice_drive_url || null}
                        clip
                      />
                      <DetailField label="Added by" value={p.created_by_name || null} />
                      {(p.direction === 'payable' || p.direction === 'receivable') && (
                        <DetailField label="Settlement" value={p.is_settled ? 'Settled' : 'Unsettled'} />
                      )}
                      <DetailField label="Created at" value={new Date(p.created_at).toLocaleString('en-IN')} />
                    </dl>
                    {/* Second line: Comments (full width) */}
                    {p.comments && (
                      <dl>
                        <DetailField label="Comments" value={p.comments} />
                      </dl>
                    )}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th scope="col" className={`px-4 py-3 font-semibold text-black dark:text-white text-sm ${right ? 'text-right' : ''}`}>
      {children}
    </th>
  )
}

function Td({ children, right, green, red, colored }: {
  children: React.ReactNode
  right?: boolean
  green?: boolean
  red?: boolean
  colored?: number
}) {
  let cls = 'text-black/70 dark:text-slate-300'
  if (green) cls = 'text-green-600 dark:text-green-400'
  if (red) cls = 'text-red-600 dark:text-red-400'
  if (colored !== undefined) cls = colored >= 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'
  return <td className={`px-4 py-2 ${right ? 'text-right' : ''} ${cls}`}>{children}</td>
}

function Empty() {
  return <p className="text-black/70 dark:text-slate-300 text-sm">No payments in this date range.</p>
}

function DetailField({ label, value, href, clip }: { label: string; value: string | null; href?: string | null; clip?: boolean }) {
  return (
    <div className={clip ? 'min-w-0 max-w-xs' : undefined}>
      <dt className="text-xs font-medium text-black/50 dark:text-slate-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-black dark:text-white break-words">
        {href
          ? <a href={href} target="_blank" rel="noopener noreferrer" className={`text-mustard hover:underline${clip ? ' block truncate' : ''}`} title={value ?? undefined}>{value}</a>
          : (value || '—')}
      </dd>
    </div>
  )
}

function PendingModal({ direction, payments, onClose }: {
  direction: 'payable' | 'receivable'
  payments: ProjectPayment[]
  onClose: () => void
}) {
  const total = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  const sorted = [...payments].sort((a, b) => b.payment_date.localeCompare(a.payment_date))
  const isPayable = direction === 'payable'
  const colorCls = isPayable ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pending-modal-title"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
          <div>
            <h2 id="pending-modal-title" className={`text-lg font-bold ${colorCls}`}>
              {isPayable ? 'Pending Payable' : 'Pending Receivable'}
            </h2>
            <p className="text-sm text-black/60 dark:text-slate-400 mt-0.5">
              {sorted.length} entr{sorted.length === 1 ? 'y' : 'ies'} · Total: <span className={`font-semibold ${colorCls}`}>{fmt(total)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-black/50 hover:text-black dark:text-slate-400 dark:hover:text-white focus-visible:ring-2 focus-visible:ring-mustard rounded p-1"
          >
            ✕
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          {sorted.length === 0 ? (
            <p className="px-6 py-8 text-black/60 dark:text-slate-300 text-sm">No pending entries.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                <tr className="bg-black/5 dark:bg-white/5 text-left">
                  <Th>Date</Th>
                  <Th>{isPayable ? 'Vendor / Manufacturer' : 'Client'}</Th>
                  <Th>Project</Th>
                  <Th>Category</Th>
                  <Th>Comments</Th>
                  <Th right>Amount</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {sorted.map((p) => (
                  <tr key={p.id} className="hover:bg-black/2 dark:hover:bg-white/2">
                    <td className="px-4 py-2.5 whitespace-nowrap text-black/70 dark:text-slate-300">{p.payment_date}</td>
                    <td className="px-4 py-2.5 text-black dark:text-white font-medium">
                      {isPayable
                        ? (p.manufacturer_name ?? p.vendor_name ?? '—')
                        : (p.project_client_name ?? '—')}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-mono text-xs text-black dark:text-white">{p.project_no}</div>
                      {!isPayable && (p.manufacturer_name ?? p.vendor_name) && (
                        <div className="text-xs text-black/50 dark:text-slate-400">{p.manufacturer_name ?? p.vendor_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-black/70 dark:text-slate-300">
                      {p.sub_type_display || SUB_TYPE_LABEL[p.sub_type] || p.sub_type}
                    </td>
                    <td className="px-4 py-2.5 text-black/60 dark:text-slate-400 max-w-[160px]">
                      <span className="line-clamp-2">{p.comments || '—'}</span>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${colorCls}`}>
                      {fmt(parseFloat(p.amount) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-black/5 dark:bg-white/5 border-t-2 border-black/10 dark:border-white/10">
                  <td colSpan={5} className="px-4 py-2.5 font-semibold text-black dark:text-white">Total</td>
                  <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${colorCls}`}>{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
