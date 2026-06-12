import { useEffect, useId, useMemo, useState } from 'react'
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

  useEffect(() => {
    if (!dateFrom || !dateTo) return
    setLoading(true)
    setError('')
    crmApi.listProjectPayments_range(dateFrom, dateTo)
      .then((r) => setPayments(r.data.results ?? r.data))
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
      if (!map[p.project]) map[p.project] = { no: p.project_no, client: p.project_client_name, credits: 0, debits: 0 }
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
                <SummaryCard label="Net P&L" amount={netPL} color={netPL >= 0 ? 'green' : 'red'} bold />
              </div>
            </section>

            {/* ── Pending summary ── */}
            {(totalPayable > 0 || totalReceivable > 0) && (
              <section aria-labelledby="pending-heading">
                <h2 id="pending-heading" className="text-sm font-semibold text-black/60 dark:text-slate-400 uppercase tracking-wide mb-3">
                  Pending
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 p-4">
                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">Payable</p>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{fmt(totalPayable)}</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/10 p-4">
                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Receivable</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{fmt(totalReceivable)}</p>
                  </div>
                </div>
              </section>
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
                          <td className="px-4 py-2 text-black/70 dark:text-slate-300">{r.client}</td>
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

              {payments.length === 0 ? <Empty /> : tableView === 'all' ? (
                <AllRowsTable payments={payments.filter(p => p.direction === 'paid' || p.direction === 'received')} />
              ) : tableView === 'by_project' ? (
                <BreakdownTable
                  rows={projectRows.map((r) => ({ label: `${r.no} · ${r.client}`, credits: r.credits, debits: r.debits, net: r.net }))}
                  firstColLabel="Project"
                />
              ) : (
                <BreakdownTable
                  rows={vendorRows.map((r) => ({ label: r.label, credits: r.credits, debits: r.debits, net: r.net }))}
                  firstColLabel="Vendor / Manufacturer"
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

function SummaryCard({ label, amount, color, bold }: { label: string; amount: number; color: 'green' | 'red'; bold?: boolean }) {
  const colorClass = color === 'green' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  return (
    <div className="bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-lg p-4">
      <div className={`${bold ? 'text-2xl' : 'text-xl'} font-bold ${colorClass}`}>
        {fmt(amount)}
      </div>
      <div className="text-sm text-black/60 dark:text-slate-300 mt-1">{label}</div>
    </div>
  )
}

function BreakdownTable({ rows, firstColLabel }: {
  rows: { label: string; credits: number; debits: number; net: number }[]
  firstColLabel: string
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
              <td className="px-4 py-2 text-black dark:text-white">{r.label}</td>
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
            <tr key={p.id} className="hover:bg-black/2 dark:hover:bg-white/2">
              <td className="px-4 py-2 text-black/70 dark:text-slate-300 whitespace-nowrap">{p.payment_date}</td>
              <td className="px-4 py-2 font-medium text-black dark:text-white">{p.project_no}</td>
              <td className="px-4 py-2 text-black/70 dark:text-slate-300">{p.project_client_name}</td>
              <td className="px-4 py-2 text-black/70 dark:text-slate-300">{p.sub_type_display || SUB_TYPE_LABEL[p.sub_type] || p.sub_type}</td>
              <td className="px-4 py-2 text-black/70 dark:text-slate-300">{p.manufacturer_name ?? p.vendor_name ?? '—'}</td>
              <td className="px-4 py-2">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  p.direction === 'received'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {p.direction === 'received' ? 'Credit' : 'Debit'}
                </span>
              </td>
              <td className={`px-4 py-2 text-right font-medium ${
                p.direction === 'received' ? 'text-green-600 dark:text-green-400' : 'text-red-700 dark:text-red-400'
              }`}>
                {fmt(parseFloat(p.amount) || 0)}
              </td>
            </tr>
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
