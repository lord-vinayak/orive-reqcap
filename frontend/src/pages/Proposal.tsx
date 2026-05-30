import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { catalogService, proposalService, requirementService } from '@/services'
import type { CatalogItem, Proposal, ProposalItem, Requirement } from '@/types'

type Tab = 'edit' | 'preview' | 'export'

const RATE_CATEGORIES = ['Basic', 'Premium', 'Luxury']

function fmt(val: number | null | undefined) {
  if (val === null || val === undefined || val === 0) return '—'
  return `₹${Number(val).toLocaleString('en-IN')}`
}

export default function ProposalPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('edit')
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [requirement, setRequirement] = useState<Requirement | null>(null)
  const [loading, setLoading] = useState(true)

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

  // Close KB dropdown on outside click or Escape
  const kbBtnRef = useRef<HTMLButtonElement>(null)
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
          <p className="text-sm text-black/60">{requirement.title}</p>
        </div>
        <span className="badge">{proposal.status}</span>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Client Costing sections" className="flex border-b border-black/10 mb-6">
        {(['edit', 'preview', 'export'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
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
        <div className="grid md:grid-cols-2 gap-6">
          {/* Catalog search */}
          <section className="card" aria-labelledby="catalog-search-heading">
            <h2 id="catalog-search-heading" className="text-lg font-semibold mb-3">Search catalog</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">

              {/* Body Part */}
              <select
                value={filters.body_part}
                onChange={(e) => setFilters((f) => ({ ...f, body_part: e.target.value, product_type: '', sub_product_type: '' }))}
              >
                <option value="">Body Part —</option>
                {facets.body_parts.map((v) => <option key={v}>{v}</option>)}
              </select>

              {/* Product Type */}
              <select
                value={filters.product_type}
                onChange={(e) => setFilters((f) => ({ ...f, product_type: e.target.value, sub_product_type: '' }))}
              >
                <option value="">Product Type —</option>
                {facets.product_types.map((v) => <option key={v}>{v}</option>)}
              </select>

              {/* Sub Product Type */}
              <select
                value={filters.sub_product_type}
                onChange={(e) => setFilters((f) => ({ ...f, sub_product_type: e.target.value }))}
              >
                <option value="">Sub Product Type —</option>
                {facets.sub_product_types.map((v) => <option key={v}>{v}</option>)}
              </select>

              {/* Key Benefits — multi-select dropdown */}
              <div ref={kbWrapRef} className="relative">
                <button
                  ref={kbBtnRef}
                  type="button"
                  onClick={openKbDrop}
                  aria-haspopup="true"
                  aria-expanded={kbOpen}
                  className="w-full text-left px-2 py-1 border border-black/15 rounded bg-white text-sm truncate hover:border-mustard"
                >
                  {filters.key_benefits.length === 0
                    ? 'Key Benefits —'
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
              <select
                value={filters.rate_category}
                onChange={(e) => setFilters((f) => ({ ...f, rate_category: e.target.value }))}
              >
                <option value="">Rate Category —</option>
                {(facets.rate_categories.length ? facets.rate_categories : RATE_CATEGORIES).map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>

              {/* Free text */}
              <input
                placeholder="Free text search"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              />
            </div>

            <p className="text-xs text-black/60 mb-2">{results.length} results</p>
            <div className="overflow-x-auto max-h-[480px]">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th scope="col">Body Part</th>
                    <th scope="col">Product Type</th>
                    <th scope="col">Sub Type</th>
                    <th scope="col">Key Benefits</th>
                    <th scope="col">Size</th>
                    <th scope="col">Potential MRP</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((c) => {
                    const isSelected = selectedIds.has(c.id)
                    const kb = [c.kb_tag1, c.kb_tag2, c.kb_tag3].filter(Boolean).join(', ')
                    return (
                      <tr key={c.id}>
                        <td>{c.body_part}</td>
                        <td>{c.product_type}</td>
                        <td>{c.sub_product_type}</td>
                        <td className="text-xs">{kb}</td>
                        <td>{c.size}</td>
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
          </section>

          {/* Selected items — fully editable inline (item #7) */}
          <section className="card" aria-labelledby="selected-heading">
            <h2 id="selected-heading" className="text-lg font-semibold mb-3">
              In this Client Costing ({proposal.items.length})
            </h2>
            {proposal.items.length === 0 ? (
              <p className="text-sm text-black/60">No items added yet. Use the catalog on the left or click “→Cost” on a product row.</p>
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
        </div>
      )}

      {tab === 'preview' && (
        <ProposalPreview proposal={proposal} requirement={requirement} />
      )}

      {tab === 'export' && (
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
          <button onClick={handleExport} disabled={proposal.items.length === 0} className="btn-primary">
            ⬇ Download XLSX
          </button>
        </section>
      )}
    </Layout>
  )
}


// ---------------------------------------------------------------------------
// Editable items table — every cell can be edited; changes PATCH the snapshot.
// (Item #7) Edits only affect the costing's local snapshot, never the catalog.
// ---------------------------------------------------------------------------
const EDITABLE_FIELDS: { key: keyof CatalogItem; label: string; numeric?: boolean }[] = [
  { key: 'body_part',           label: 'Body Part' },
  { key: 'product_type',        label: 'Product Type' },
  { key: 'sub_product_type',    label: 'Sub Type' },
  { key: 'kb_tag1',             label: 'KB 1' },
  { key: 'kb_tag2',             label: 'KB 2' },
  { key: 'kb_tag3',             label: 'KB 3' },
  { key: 'specific_ingredients',label: 'Specific Ingredients' },
  { key: 'color',               label: 'Color' },
  { key: 'fragrance',           label: 'Fragrance' },
  { key: 'size',                label: 'Size' },
  { key: 'packaging_type',      label: 'Packaging' },
  { key: 'rate_category',       label: 'Rate Category' },
  { key: 'per_kg_rate',         label: 'Per KG Rate',         numeric: true },
  { key: 'manufacturing_cost',  label: 'Mfg Cost',            numeric: true },
  { key: 'rate_per_unit',       label: 'Rate / Unit',         numeric: true },
  { key: 'tentative_packaging_cost', label: 'Packaging Cost', numeric: true },
  { key: 'label_cost',          label: 'Label Cost',          numeric: true },
  { key: 'tentative_monocarton_cost', label: 'Monocarton',    numeric: true },
  { key: 'total_cost',          label: 'Total Cost',          numeric: true },
  { key: 'potential_mrp',       label: 'Potential MRP',       numeric: true },
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

  const cellValue = (it: ProposalItem, field: keyof CatalogItem) => {
    if (draft[it.id]?.[field as string] !== undefined) return draft[it.id][field as string]
    const v = (it.catalog_data as any)[field]
    return v === null || v === undefined ? '' : String(v)
  }

  const updateLocal = (itemId: string, field: string, value: string) => {
    setDraft((prev) => ({ ...prev, [itemId]: { ...(prev[itemId] || {}), [field]: value } }))
  }

  const commit = async (it: ProposalItem, field: typeof EDITABLE_FIELDS[number]) => {
    const newVal = draft[it.id]?.[field.key as string]
    if (newVal === undefined) return
    const original = (it.catalog_data as any)[field.key]
    const originalStr = original === null || original === undefined ? '' : String(original)
    if (newVal === originalStr) return
    const patchVal: unknown = field.numeric
      ? (newVal === '' ? null : Number(newVal))
      : newVal
    try {
      await onItemChange(it.id, { [field.key]: patchVal })
    } finally {
      setDraft((prev) => {
        const next = { ...prev }
        if (next[it.id]) {
          const { [field.key as string]: _, ...rest } = next[it.id]
          if (Object.keys(rest).length === 0) delete next[it.id]
          else next[it.id] = rest
        }
        return next
      })
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse" aria-label="Client Costing items — all cells editable">
        <thead>
          <tr className="bg-mustard-50 text-black/80">
            <th scope="col" className="px-2 py-1 text-left font-medium w-8">#</th>
            {EDITABLE_FIELDS.map((f) => (
              <th key={f.key as string} scope="col" className="px-2 py-1 text-left font-medium whitespace-nowrap">
                {f.label}
              </th>
            ))}
            <th scope="col" className="px-2 py-1 text-center font-medium w-16">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.id} className={idx % 2 === 1 ? 'bg-black/[0.02]' : ''}>
              <td className="px-2 py-1 text-center text-black/50 font-medium">{idx + 1}</td>
              {EDITABLE_FIELDS.map((f) => (
                <td key={f.key as string} className="px-1 py-1">
                  <input
                    type={f.numeric ? 'number' : 'text'}
                    value={cellValue(it, f.key)}
                    onChange={(e) => updateLocal(it.id, f.key as string, e.target.value)}
                    onBlur={() => commit(it, f)}
                    className="w-full px-1 py-0.5 border border-transparent rounded bg-transparent hover:bg-mustard-50/50 focus:bg-white focus:border-mustard text-xs"
                    aria-label={`Item ${idx + 1} ${f.label}`}
                  />
                </td>
              ))}
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
          ))}
        </tbody>
      </table>
    </div>
  )
}


// ---------------------------------------------------------------------------
// Preview component — shows all catalog cost fields
// ---------------------------------------------------------------------------
function ProposalPreview({ proposal, requirement }: { proposal: Proposal; requirement: Requirement }) {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const client = requirement.client_data
  return (
    <section className="card max-w-6xl overflow-x-auto">
      <p className="text-xs text-black/60 mb-3">Preview of the Excel that will be exported.</p>
      <div className="border border-black/15 min-w-[900px]">
        {/* Single table so header rows stretch to match the data columns */}
        <table className="w-full text-sm">
          <thead>
            {/* Company header */}
            <tr>
              <th colSpan={18} className="bg-mustard text-black font-bold text-center py-3 text-xl">
                SKINOVATION SCIENCES
              </th>
            </tr>
            {/* Sub-header */}
            <tr>
              <th colSpan={18} className="bg-mustard-50 text-center py-2 font-semibold border-b border-black/10">
                Client Costing
              </th>
            </tr>
            {/* Client info */}
            <tr>
              <td colSpan={18} className="px-4 py-3 border-b border-black/10">
                <div className="grid grid-cols-[180px_1fr] gap-y-1 text-sm">
                  <div className="font-medium">Date</div><div>{today}</div>
                  <div className="font-medium">Client Name</div><div>{client?.name || ''}</div>
                  <div className="font-medium">Phone</div><div>{client?.phone_no || ''}</div>
                  <div className="font-medium">Point of Contact</div><div>{client?.poc_name || ''}</div>
                </div>
              </td>
            </tr>
            {/* Column headers */}
            <tr className="bg-mustard text-black">
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
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Per KG Rate</th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Manufacturing Cost</th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Rate Per Unit</th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Tentative Packaging Cost</th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Label Cost</th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Tentative Monocarton Cost</th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Total Cost</th>
              <th scope="col" className="text-right px-3 py-2 whitespace-nowrap">Potential MRP</th>
            </tr>
          </thead>
          <tbody>
            {proposal.items.map((it, i) => {
              const c = it.catalog_data
              const kb = [c.kb_tag1, c.kb_tag2, c.kb_tag3].filter(Boolean).join(', ')
              return (
                <tr key={it.id} className={i % 2 === 1 ? 'bg-black/[0.02]' : ''}>
                  <td className="px-3 py-2 border-t border-black/5">{c.body_part}</td>
                  <td className="px-3 py-2 border-t border-black/5">{c.product_type}</td>
                  <td className="px-3 py-2 border-t border-black/5">{c.sub_product_type}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs">{kb}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-xs">{c.specific_ingredients}</td>
                  <td className="px-3 py-2 border-t border-black/5">{c.color || '—'}</td>
                  <td className="px-3 py-2 border-t border-black/5">{c.fragrance || '—'}</td>
                  <td className="px-3 py-2 border-t border-black/5">{c.size}</td>
                  <td className="px-3 py-2 border-t border-black/5">{c.packaging_type}</td>
                  <td className="px-3 py-2 border-t border-black/5">{c.rate_category || '—'}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-right">{fmt(c.per_kg_rate)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-right">{fmt(c.manufacturing_cost)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-right">{fmt(c.rate_per_unit)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-right">{fmt(c.tentative_packaging_cost)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-right">{fmt(c.label_cost)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-right">{fmt(c.tentative_monocarton_cost)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-right">{fmt(c.total_cost)}</td>
                  <td className="px-3 py-2 border-t border-black/5 text-right">{fmt(c.potential_mrp)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>  {/* single unified table ends here */}
      </div>
    </section>
  )
}
