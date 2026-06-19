import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import SendEmailModal from '@/components/SendEmailModal'
import { catalogService, proposalService, requirementService } from '@/services'
import type { CatalogItem, Proposal, ProposalItem, Requirement } from '@/types'

type Tab = 'edit' | 'preview' | 'export'

const RATE_CATEGORIES = ['Basic', 'Premium', 'Luxury']

function fmt(val: number | null | undefined) {
  if (val === null || val === undefined) return '—'
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Extract a leading number from a string like "100g", "500ml", "250". */
function parseNumeric(val: unknown): number {
  if (val === null || val === undefined || val === '') return NaN
  const s = String(val)
  const m = s.match(/^[\d.]+/)
  return m ? parseFloat(m[0]) : NaN
}

/** Compute the four derived cost columns from a merged row data object. */
function computedCosts(data: Record<string, unknown>) {
  const perKg  = parseNumeric(data.per_kg_rate)
  const size   = parseNumeric(data.size)               // handles "100g" → 100
  const mfg    = parseNumeric(data.manufacturing_cost)
  const pkg    = parseNumeric(data.tentative_packaging_cost)
  const label  = parseNumeric(data.label_cost)
  const mono   = parseNumeric(data.tentative_monocarton_cost)

  const rawPerUnit = (!isNaN(perKg) && !isNaN(size))   ? (perKg / 1000) * size          : null
  const estUnit    = (rawPerUnit !== null && !isNaN(mfg)) ? rawPerUnit + mfg               : null
  const total      = estUnit !== null
    ? estUnit + (!isNaN(pkg) ? pkg : 0) + (!isNaN(label) ? label : 0) + (!isNaN(mono) ? mono : 0)
    : null
  const mrp        = total !== null ? total * 6 : null

  return { rawPerUnit, estUnit, total, mrp }
}

/** Format a computed (derived) value — always 2 dp with locale thousands separator. */
function fmtCalc(val: number | null): string {
  if (val === null || isNaN(val as number)) return '—'
  return `₹${(val as number).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ProposalPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('edit')
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [requirement, setRequirement] = useState<Requirement | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailToast, setEmailToast] = useState('')

  // Catalog search state
  const [facets, setFacets] = useState<{
    body_parts: string[]; product_types: string[]; sub_product_types: string[]; key_benefits: string[]; rate_categories: string[]
  }>({ body_parts: [], product_types: [], sub_product_types: [], key_benefits: [], rate_categories: [] })

  const [filters, setFilters] = useState({
    body_part: '', product_type: '', sub_product_type: '', key_benefits: [] as string[], rate_category: '', q: '',
  })
  const [results, setResults] = useState<CatalogItem[]>([])

  // Key benefits dropdown state
  const [kbOpen, setKbOpen] = useState(false)
  const [kbDropStyle, setKbDropStyle] = useState<React.CSSProperties>({})
  const kbWrapRef = useRef<HTMLDivElement>(null)
  const kbDropRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    if (!id) return
    const r = await requirementService.get(id)
    setRequirement(r)
    const p = await proposalService.getForRequirement(id)
    setProposal(p)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  // Load facets
  useEffect(() => {
    catalogService.facets({
      ...(filters.body_part ? { body_part: filters.body_part } : {}),
      ...(filters.product_type ? { product_type: filters.product_type } : {}),
    }).then(setFacets)
  }, [filters.body_part, filters.product_type])

  // Search results
  useEffect(() => {
    const params: Record<string, string | string[]> = {}
    if (filters.body_part) params.body_part = filters.body_part
    if (filters.product_type) params.product_type = filters.product_type
    if (filters.sub_product_type) params.sub_product_type = filters.sub_product_type
    if (filters.key_benefits.length) params.key_benefit = filters.key_benefits
    if (filters.rate_category) params.rate_category = filters.rate_category
    if (filters.q) params.q = filters.q
    catalogService.search(params).then(setResults)
  }, [filters])

  // Focus first focusable element inside KB dropdown when it opens
  const kbBtnRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!kbOpen || !kbDropRef.current) return
    const first = kbDropRef.current.querySelector<HTMLElement>('input, button, [tabindex]')
    first?.focus()
  }, [kbOpen])

  // Close KB dropdown on outside click or Escape
  useEffect(() => {
    if (!kbOpen) return
    const handleMouse = (e: MouseEvent) => {
      const t = e.target as Node
      if (kbWrapRef.current?.contains(t) || kbDropRef.current?.contains(t)) return
      setKbOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setKbOpen(false); kbBtnRef.current?.focus() }
    }
    document.addEventListener('mousedown', handleMouse)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleMouse)
      document.removeEventListener('keydown', handleKey)
    }
  }, [kbOpen])

  const openKbDrop = () => {
    if (kbWrapRef.current) {
      const rect = kbWrapRef.current.getBoundingClientRect()
      setKbDropStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, minWidth: rect.width, zIndex: 9999 })
    }
    setKbOpen((o) => !o)
  }

  const toggleKb = (kb: string) =>
    setFilters((f) => ({
      ...f,
      key_benefits: f.key_benefits.includes(kb)
        ? f.key_benefits.filter((x) => x !== kb)
        : [...f.key_benefits, kb],
    }))

  const handleAdd = async (catalogItemId: string) => {
    if (!proposal) return
    await proposalService.addItem(proposal.id, catalogItemId)
    await load()
  }

  const handleRemove = async (itemId: string) => {
    await proposalService.removeItem(itemId)
    await load()
  }

  const handleExport = async () => {
    if (!proposal) return
    const blob = await proposalService.exportXlsx(proposal.id)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Proposal_${requirement?.client_data?.name || 'client'}_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
    await load()
  }

  const selectedIds = useMemo(() => new Set(proposal?.items.map((i) => i.catalog_item) || []), [proposal])

  if (loading || !proposal || !requirement) {
    return <Layout title="Client Costing"><p className="text-black/60">Loading Client Costing…</p></Layout>
  }

  return (
    <Layout title={`Client Costing – ${requirement.title}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold">Client Costing</h1>
          <p className="text-sm text-black/60 dark:text-white/70">{requirement.title}</p>
        </div>
        <span className="badge">{proposal.status}</span>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Client Costing sections" className="flex border-b border-black/10 mb-6">
        {(['edit', 'preview', 'export'] as Tab[]).map((t) => (
          <button
            key={t}
            id={`tab-${t}`}
            role="tab"
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-mustard text-black' : 'border-transparent text-black/60 hover:text-black'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'edit' && (
        <div id="panel-edit" role="tabpanel" aria-labelledby="tab-edit" tabIndex={0} className="flex flex-col gap-6">

          {/* ponytail: hidden per product request — set to true to re-enable */}
          {(false as boolean) && <section className="card" aria-labelledby="catalog-search-heading">
            <h2 id="catalog-search-heading" className="text-lg font-semibold mb-3">Search catalog</h2>

            {/* Filter bar — one row across full width */}
            <div className="flex flex-wrap gap-2 mb-3">

              {/* Body Part */}
              <div className="flex-1 min-w-[130px] flex flex-col gap-0.5">
                <label htmlFor="proposal-filter-body-part" className="text-xs font-medium text-black/60 dark:text-slate-300">Body Part</label>
                <select
                  id="proposal-filter-body-part"
                  className="text-sm h-9 px-2"
                  value={filters.body_part}
                  onChange={(e) => setFilters((f) => ({ ...f, body_part: e.target.value, product_type: '', sub_product_type: '' }))}
                >
                  <option value="">All</option>
                  {facets.body_parts.map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>

              {/* Product Type */}
              <div className="flex-1 min-w-[130px] flex flex-col gap-0.5">
                <label htmlFor="proposal-filter-product-type" className="text-xs font-medium text-black/60 dark:text-slate-300">Product Type</label>
                <select
                  id="proposal-filter-product-type"
                  className="text-sm h-9 px-2"
                  value={filters.product_type}
                  onChange={(e) => setFilters((f) => ({ ...f, product_type: e.target.value, sub_product_type: '' }))}
                >
                  <option value="">All</option>
                  {facets.product_types.map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>

              {/* Sub Product Type */}
              <div className="flex-1 min-w-[130px] flex flex-col gap-0.5">
                <label htmlFor="proposal-filter-sub" className="text-xs font-medium text-black/60 dark:text-slate-300">Sub Type</label>
                <select
                  id="proposal-filter-sub"
                  className="text-sm h-9 px-2"
                  value={filters.sub_product_type}
                  onChange={(e) => setFilters((f) => ({ ...f, sub_product_type: e.target.value }))}
                >
                  <option value="">All</option>
                  {facets.sub_product_types.map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>

              {/* Key Benefits — multi-select dropdown */}
              <div ref={kbWrapRef} className="flex-1 min-w-[130px] relative flex flex-col gap-0.5">
                <label htmlFor="proposal-filter-key-benefits" className="text-xs font-medium text-black/60 dark:text-slate-300">Key Benefits</label>
                <button
                  id="proposal-filter-key-benefits"
                  ref={kbBtnRef}
                  type="button"
                  onClick={openKbDrop}
                  aria-haspopup="dialog"
                  aria-expanded={kbOpen}
                  className="w-full h-9 text-left px-2 border border-black/15 rounded bg-white text-sm truncate hover:border-mustard"
                >
                  {filters.key_benefits.length === 0
                    ? 'All'
                    : filters.key_benefits.join(', ')}
                </button>
                {kbOpen && createPortal(
                  <div
                    ref={kbDropRef}
                    role="group"
                    aria-label="Key benefits options"
                    style={kbDropStyle}
                    className="max-h-52 overflow-auto bg-white border border-black/15 rounded shadow-lg p-2"
                  >
                    {facets.key_benefits.length === 0 && (
                      <p className="text-xs text-black/60 px-2 py-1">No options available.</p>
                    )}
                    {facets.key_benefits.map((kb) => (
                      <label key={kb} className="flex items-center gap-2 px-2 py-1 hover:bg-mustard-50 rounded cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          className="accent-mustard"
                          checked={filters.key_benefits.includes(kb)}
                          onChange={() => toggleKb(kb)}
                        />
                        <span>{kb}</span>
                      </label>
                    ))}
                  </div>,
                  document.body,
                )}
              </div>

              {/* Rate Category */}
              <div className="flex-1 min-w-[120px] flex flex-col gap-0.5">
                <label htmlFor="proposal-filter-rate" className="text-xs font-medium text-black/60 dark:text-slate-300">Rate Category</label>
                <select
                  id="proposal-filter-rate"
                  className="text-sm h-9 px-2"
                  value={filters.rate_category}
                  onChange={(e) => setFilters((f) => ({ ...f, rate_category: e.target.value }))}
                >
                  <option value="">All</option>
                  {(facets.rate_categories.length ? facets.rate_categories : RATE_CATEGORIES).map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Free text */}
              <div className="flex-1 min-w-[140px] flex flex-col gap-0.5">
                <label htmlFor="proposal-filter-search" className="text-xs font-medium text-black/60 dark:text-slate-300">Search</label>
                <input
                  id="proposal-filter-search"
                  className="text-sm h-9 px-2"
                  placeholder="Free text search…"
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                />
              </div>
            </div>

            {/* Result count */}
            <p className="text-xs text-black/60 mb-2">
              {results.length <= 10
                ? `${results.length} result${results.length !== 1 ? 's' : ''}`
                : `Showing 10 of ${results.length} — refine filters to narrow down`}
            </p>

            <div className="overflow-x-auto">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th scope="col">Body Part</th>
                    <th scope="col">Product Type</th>
                    <th scope="col">Sub Type</th>
                    <th scope="col">Key Benefits</th>
                    <th scope="col">Size</th>
                    <th scope="col">Packaging</th>
                    <th scope="col">Rate Category</th>
                    <th scope="col">Potential MRP</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 10).map((c) => {
                    const isSelected = selectedIds.has(c.id)
                    const kb = [c.kb_tag1, c.kb_tag2, c.kb_tag3].filter(Boolean).join(', ')
                    return (
                      <tr key={c.id}>
                        <td>{c.body_part}</td>
                        <td>{c.product_type}</td>
                        <td>{c.sub_product_type}</td>
                        <td className="text-xs">{kb}</td>
                        <td>{c.size}</td>
                        <td>{c.packaging_type}</td>
                        <td>{c.rate_category || '—'}</td>
                        <td>{fmt(c.potential_mrp)}</td>
                        <td>
                          <button
                            disabled={isSelected}
                            onClick={() => handleAdd(c.id)}
                            className={isSelected ? 'btn-secondary text-xs' : 'btn-primary text-xs'}
                          >
                            {isSelected ? 'Added' : 'Add'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>}

          {/* ── Bottom pane: editable costing table — full width ── */}
          <section className="card" aria-labelledby="selected-heading">
            <h2 id="selected-heading" className="text-lg font-semibold mb-3">
              In this Client Costing ({proposal.items.length})
            </h2>
            {proposal.items.length === 0 ? (
              <p className="text-sm text-black/60">No items added yet. Search the catalog above and click Add.</p>
            ) : (
              <EditableItemsTable
                items={proposal.items}
                onItemChange={async (itemId, patch) => {
                  await proposalService.updateItem(itemId, patch)
                  await load()
                }}
                onRemove={handleRemove}
              />
            )}
          </section>

          <div className="flex justify-end pt-2">
            <button type="button" onClick={() => setTab('preview')} className="text-sm text-black/60 dark:text-slate-400 hover:text-black dark:hover:text-white">
              Go to Preview →
            </button>
          </div>

        </div>
      )}

      {tab === 'preview' && (
        <div id="panel-preview" role="tabpanel" aria-labelledby="tab-preview" tabIndex={0}>
          <ProposalPreview proposal={proposal} requirement={requirement} />
          <div className="flex justify-between pt-4">
            <button type="button" onClick={() => setTab('edit')} className="text-sm text-black/60 dark:text-slate-400 hover:text-black dark:hover:text-white">
              ← Go to Edit
            </button>
            <button type="button" onClick={() => setTab('export')} className="text-sm text-black/60 dark:text-slate-400 hover:text-black dark:hover:text-white">
              Go to Export →
            </button>
          </div>
        </div>
      )}

      {tab === 'export' && (
        <div id="panel-export" role="tabpanel" aria-labelledby="tab-export" tabIndex={0}>
        <section className="card max-w-xl">
          <h2 className="text-lg font-semibold mb-2">Export to Excel</h2>
          <p className="text-sm text-black/60 mb-4">
            Generates a formatted .xlsx with the company logo, header, client info, and selected catalog rows.
          </p>
          {proposal.last_exported_at && (
            <p className="text-xs text-black/60 mb-3">
              Last exported: {new Date(proposal.last_exported_at).toLocaleString()}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button onClick={handleExport} disabled={proposal.items.length === 0} className="btn-primary">
              ⬇ Download XLSX
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              disabled={proposal.items.length === 0}
              className="btn-secondary"
            >
              ✉ Send Email
            </button>
          </div>
        </section>
          <div className="pt-4">
            <button type="button" onClick={() => setTab('preview')} className="text-sm text-black/60 dark:text-slate-400 hover:text-black dark:hover:text-white">
              ← Go to Preview
            </button>
          </div>
        </div>
      )}

      {/* Email modal */}
      {showEmailModal && requirement && (
        <SendEmailModal
          requirementId={requirement.id}
          proposals={[proposal]}
          clientEmail={requirement.client_data?.email ?? ''}
          clientName={requirement.client_data?.name ?? ''}
          defaultProposalId={proposal.id}
          onClose={() => setShowEmailModal(false)}
          onSent={() => {
            const name = requirement.client_data?.name ?? 'client'
            setEmailToast(`Email sent to ${name} successfully.`)
            setTimeout(() => setEmailToast(''), 4000)
          }}
        />
      )}

      {/* Success toast */}
      {emailToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-green-600 text-white text-sm font-medium px-4 py-3 rounded shadow-lg"
        >
          ✓ {emailToast}
        </div>
      )}
    </Layout>
  )
}


// ---------------------------------------------------------------------------
// Editable items table — directly-entered cells PATCH the snapshot;
// derived (auto) cells are computed on the fly and shown read-only.
// ---------------------------------------------------------------------------

/** Column descriptor — either an editable input or an auto-computed display cell. */
type ColSpec =
  | { kind: 'edit'; key: string; label: string; numeric?: boolean; tentative?: boolean }
  | { kind: 'calc'; key: string; label: string; tentative?: boolean }

const TABLE_COLUMNS: ColSpec[] = [
  { kind: 'edit', key: 'body_part',                 label: 'Body Part' },
  { kind: 'edit', key: 'product_type',              label: 'Product Type' },
  { kind: 'edit', key: 'sub_product_type',          label: 'Sub Type' },
  { kind: 'edit', key: 'kb_tag1',                   label: 'KB 1' },
  { kind: 'edit', key: 'kb_tag2',                   label: 'KB 2' },
  { kind: 'edit', key: 'kb_tag3',                   label: 'KB 3' },
  { kind: 'edit', key: 'specific_ingredients',      label: 'Specific Ingredients' },
  { kind: 'edit', key: 'color',                     label: 'Color' },
  { kind: 'edit', key: 'fragrance',                 label: 'Fragrance' },
  { kind: 'edit', key: 'size',                      label: 'Size' },
  { kind: 'edit', key: 'packaging_type',            label: 'Packaging' },
  { kind: 'edit', key: 'rate_category',             label: 'Rate Category' },
  // Cost columns — editable inputs first, then auto-computed cells interleaved
  { kind: 'edit', key: 'per_kg_rate',               label: 'RM Cost/kg',      numeric: true },
  { kind: 'calc', key: 'raw_per_unit',              label: 'RM Cost/unit' },
  { kind: 'edit', key: 'manufacturing_cost',        label: 'Mfg Cost',        numeric: true },
  { kind: 'calc', key: 'est_unit',                  label: 'Est. Unit Cost' },
  { kind: 'edit', key: 'tentative_packaging_cost',  label: 'Pkg Cost',        numeric: true,  tentative: true },
  { kind: 'edit', key: 'label_cost',                label: 'Label Cost',      numeric: true,  tentative: true },
  { kind: 'edit', key: 'tentative_monocarton_cost', label: 'Monocarton',      numeric: true,  tentative: true },
  { kind: 'calc', key: 'total_cost',                label: 'Total Cost',                       tentative: true },
  { kind: 'calc', key: 'potential_mrp',             label: 'Potential MRP',                    tentative: true },
]

function EditableItemsTable({
  items, onItemChange, onRemove,
}: {
  items: ProposalItem[]
  onItemChange: (itemId: string, patch: Record<string, unknown>) => Promise<void>
  onRemove: (id: string) => void
}) {
  // Local editable buffer — PATCH only fires on blur to avoid spam.
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({})

  /** Merge server-side catalog_data with any unsaved local draft for this row. */
  const getMerged = (it: ProposalItem): Record<string, unknown> => ({
    ...(it.catalog_data as unknown as Record<string, unknown>),
    ...(draft[it.id] || {}),
  })

  const cellValue = (it: ProposalItem, key: string): string => {
    if (draft[it.id]?.[key] !== undefined) return draft[it.id][key]
    const v = (it.catalog_data as any)[key]
    return v === null || v === undefined ? '' : String(v)
  }

  const updateLocal = (itemId: string, field: string, value: string) => {
    setDraft((prev) => ({ ...prev, [itemId]: { ...(prev[itemId] || {}), [field]: value } }))
  }

  const commit = async (it: ProposalItem, col: Extract<ColSpec, { kind: 'edit' }>) => {
    const newVal = draft[it.id]?.[col.key]
    if (newVal === undefined) return
    const original = (it.catalog_data as any)[col.key]
    const originalStr = original === null || original === undefined ? '' : String(original)
    if (newVal === originalStr) return
    const patchVal: unknown = col.numeric
      ? (newVal === '' ? null : Number(newVal))
      : newVal
    try {
      await onItemChange(it.id, { [col.key]: patchVal })
    } finally {
      setDraft((prev) => {
        const next = { ...prev }
        if (next[it.id]) {
          const { [col.key]: _, ...rest } = next[it.id]
          if (Object.keys(rest).length === 0) delete next[it.id]
          else next[it.id] = rest
        }
        return next
      })
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse" aria-label="Client Costing items">
        <thead>
          <tr className="bg-mustard-50 text-black/80">
            <th scope="col" className="px-2 py-1 text-left font-medium w-8">#</th>
            {TABLE_COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-2 py-1 text-left font-medium whitespace-nowrap ${
                  col.kind === 'calc' ? 'text-black/70 italic' : ''
                }`}
              >
                {col.label}
                {col.tentative && (
                  <span className="ml-0.5 text-[10px] font-semibold text-amber-600" aria-label="tentative">~</span>
                )}
                {col.kind === 'calc' && (
                  <span className="ml-1 text-[9px] font-normal not-italic">(auto)</span>
                )}
              </th>
            ))}
            <th scope="col" className="px-2 py-1 text-center font-medium w-16">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => {
            const merged = getMerged(it)
            const cv = computedCosts(merged)
            const calcValues: Record<string, number | null> = {
              raw_per_unit:  cv.rawPerUnit,
              est_unit:      cv.estUnit,
              total_cost:    cv.total,
              potential_mrp: cv.mrp,
            }
            return (
              <tr key={it.id} className={idx % 2 === 1 ? 'bg-black/[0.02]' : ''}>
                <td className="px-2 py-1 text-center text-black/70 font-medium">{idx + 1}</td>
                {TABLE_COLUMNS.map((col) => {
                  if (col.kind === 'calc') {
                    const val = calcValues[col.key]
                    // Explain WHY a cell is blank so users know what to fill in.
                    const perKgSet = !isNaN(parseNumeric(merged.per_kg_rate))
                    const sizeSet  = !isNaN(parseNumeric(merged.size))
                    let hint = 'Auto-calculated'
                    if (val === null) {
                      if (col.key === 'raw_per_unit') {
                        hint = perKgSet ? 'Enter Size to calculate' : 'Enter RM Cost/kg and Size to calculate'
                      } else {
                        hint = sizeSet && perKgSet ? 'Waiting on upstream values' : 'Enter RM Cost/kg and Size to calculate'
                      }
                    }
                    return (
                      <td
                        key={col.key}
                        className="px-2 py-1 text-right bg-amber-50/50 text-black/70 font-medium tabular-nums whitespace-nowrap"
                        title={hint}
                      >
                        {val === null
                          ? <span className="text-black/30 italic text-xs">{perKgSet && !sizeSet && col.key === 'raw_per_unit' ? '↑ size?' : '—'}</span>
                          : fmtCalc(val)}
                      </td>
                    )
                  }
                  return (
                    <td key={col.key} className="px-1 py-1">
                      <input
                        type={col.numeric ? 'number' : 'text'}
                        value={cellValue(it, col.key)}
                        onChange={(e) => updateLocal(it.id, col.key, e.target.value)}
                        onBlur={() => commit(it, col as Extract<ColSpec, { kind: 'edit' }>)}
                        className="w-full px-1 py-0.5 border border-transparent rounded bg-transparent hover:bg-mustard-50/50 focus:bg-white focus:border-mustard text-sm"
                        aria-label={`Item ${idx + 1} ${col.label}`}
                      />
                    </td>
                  )
                })}
                <td className="px-2 py-1 text-center">
                  <button
                    type="button"
                    onClick={() => onRemove(it.id)}
                    className="text-red-700 hover:underline text-xs"
                    aria-label={`Remove item ${idx + 1} from Client Costing`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}


// ---------------------------------------------------------------------------
// Preview component — mirrors the XLSX layout exactly.
// Calculated columns shown with a light amber background.
// ---------------------------------------------------------------------------
function ProposalPreview({ proposal, requirement }: { proposal: Proposal; requirement: Requirement }) {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const client = requirement.client_data
  const TOTAL_COLS = 19
  return (
    <section className="card overflow-x-auto">
      <p className="text-xs text-black/60 mb-3">Preview of the Excel that will be exported.</p>
      <div className="border border-black/15 min-w-[1100px]">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th colSpan={TOTAL_COLS} className="bg-mustard text-black font-bold text-center py-3 text-xl">
                SKINOVATION SCIENCES
              </th>
            </tr>
            <tr>
              <th colSpan={TOTAL_COLS} className="bg-mustard-50 text-center py-2 font-semibold border-b border-black/10">
                Client Costing
              </th>
            </tr>
            <tr>
              <td colSpan={TOTAL_COLS} className="px-4 py-3 border-b border-black/10">
                <div className="grid grid-cols-[180px_1fr] gap-y-1 text-sm">
                  <div className="font-medium">Date</div><div>{today}</div>
                  <div className="font-medium">Client Name</div><div>{client?.name || ''}</div>
                  <div className="font-medium">Phone</div><div>{client?.phone_no || ''}</div>
                  <div className="font-medium">Point of Contact</div><div>{client?.poc_name || ''}</div>
                </div>
              </td>
            </tr>
            <tr className="bg-mustard text-black text-xs">
              <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">Body Part</th>
              <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">Product Type</th>
              <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">Sub Product Type</th>
              <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">Key Benefits</th>
              <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">Specific Ingredients</th>
              <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">Color</th>
              <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">Fragrance</th>
              <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">Size</th>
              <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">Packaging</th>
              <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">Rate Category</th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">RM Cost (per kg)</th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">RM Cost (per unit)</th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Manufacturing Cost</th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Estimated Unit Cost</th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Tentative Packaging Cost <span className="text-amber-400 font-semibold" aria-label="tentative">~</span></th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Label Cost <span className="text-amber-400 font-semibold" aria-label="tentative">~</span></th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Tentative Monocarton Cost <span className="text-amber-400 font-semibold" aria-label="tentative">~</span></th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Total Cost <span className="text-amber-400 font-semibold" aria-label="tentative">~</span></th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Potential MRP <span className="text-amber-400 font-semibold" aria-label="tentative">~</span></th>
            </tr>
          </thead>
          <tbody>
            {proposal.items.map((it, i) => {
              const c = it.catalog_data as Record<string, any>
              const kb = [c.kb_tag1, c.kb_tag2, c.kb_tag3].filter(Boolean).join(', ')
              const cv = computedCosts(c as Record<string, unknown>)
              return (
                <tr key={it.id} className={i % 2 === 1 ? 'bg-black/[0.02]' : ''}>
                  <td className="px-3 py-2 border-t border-black/5 text-xs">{c.body_part}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs">{c.product_type}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs">{c.sub_product_type}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs">{kb}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs">{c.specific_ingredients}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs">{c.color || '—'}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs">{c.fragrance || '—'}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs">{c.size}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs">{c.packaging_type}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs">{c.rate_category || '—'}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs text-right">{fmt(c.per_kg_rate)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs text-right bg-amber-50/40 font-medium">{fmtCalc(cv.rawPerUnit)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs text-right">{fmt(c.manufacturing_cost)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs text-right bg-amber-50/40 font-medium">{fmtCalc(cv.estUnit)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs text-right">{fmt(c.tentative_packaging_cost)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs text-right">{fmt(c.label_cost)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs text-right">{fmt(c.tentative_monocarton_cost)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs text-right bg-amber-50/40 font-semibold">{fmtCalc(cv.total)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs text-right bg-amber-50/40 font-semibold">{fmtCalc(cv.mrp)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-black/50 italic">
        <span className="text-amber-600 font-semibold not-italic">~</span> Tentative figures
      </p>
    </section>
  )
}
