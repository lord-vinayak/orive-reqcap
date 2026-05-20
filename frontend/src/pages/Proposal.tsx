import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { catalogService, proposalService, requirementService } from '@/services'
import type { CatalogItem, Proposal, Requirement } from '@/types'

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

  // Close KB dropdown on outside click
  useEffect(() => {
    if (!kbOpen) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (kbWrapRef.current?.contains(t) || kbDropRef.current?.contains(t)) return
      setKbOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
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
    return <Layout><p className="text-black/60">Loading proposal…</p></Layout>
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold">Proposal</h1>
          <p className="text-sm text-black/60">{requirement.title}</p>
        </div>
        <span className="badge">{proposal.status}</span>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Proposal sections" className="flex border-b border-black/10 mb-6">
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
                  type="button"
                  onClick={openKbDrop}
                  className="w-full text-left px-2 py-1 border border-black/15 rounded bg-white text-sm truncate hover:border-mustard"
                >
                  {filters.key_benefits.length === 0
                    ? 'Key Benefits —'
                    : filters.key_benefits.join(', ')}
                </button>
                {kbOpen && createPortal(
                  <div
                    ref={kbDropRef}
                    style={kbDropStyle}
                    className="max-h-52 overflow-auto bg-white border border-black/15 rounded shadow-lg p-2"
                  >
                    {facets.key_benefits.length === 0 && (
                      <p className="text-xs text-black/50 px-2 py-1">No options available.</p>
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

            <p className="text-xs text-black/50 mb-2">{results.length} results</p>
            <div className="overflow-x-auto max-h-[480px]">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>Body Part</th>
                    <th>Product Type</th>
                    <th>Sub Type</th>
                    <th>Key Benefits</th>
                    <th>Size</th>
                    <th>Potential MRP</th>
                    <th></th>
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

          {/* Selected items */}
          <section className="card" aria-labelledby="selected-heading">
            <h2 id="selected-heading" className="text-lg font-semibold mb-3">In this proposal ({proposal.items.length})</h2>
            {proposal.items.length === 0 ? (
              <p className="text-sm text-black/50">No items added yet. Use the catalog on the left.</p>
            ) : (
              <ol className="space-y-2">
                {proposal.items.map((it) => {
                  const c = it.catalog_data
                  return (
                    <li key={it.id} className="border border-black/10 rounded p-3 flex items-start justify-between">
                      <div className="text-sm">
                        <div className="font-medium">{c.body_part} • {c.product_type} • {c.sub_product_type}</div>
                        <div className="text-black/60 text-xs">{[c.kb_tag1, c.kb_tag2, c.kb_tag3].filter(Boolean).join(', ')}</div>
                        <div className="text-black/60 text-xs">{c.specific_ingredients}</div>
                      </div>
                      <button onClick={() => handleRemove(it.id)} className="btn-danger text-xs">Remove</button>
                    </li>
                  )
                })}
              </ol>
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
            <p className="text-xs text-black/50 mb-3">
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
// Preview component — shows all catalog cost fields
// ---------------------------------------------------------------------------
function ProposalPreview({ proposal, requirement }: { proposal: Proposal; requirement: Requirement }) {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const client = requirement.client_data
  return (
    <section className="card max-w-6xl overflow-x-auto">
      <p className="text-xs text-black/50 mb-3">Preview of the Excel that will be exported.</p>
      <div className="border border-black/15 min-w-[900px]">
        {/* Company header */}
        <div className="bg-mustard text-black font-bold text-center py-3 text-xl">
          SKINOVATION SCIENCES
        </div>
        <div className="bg-mustard-50 text-center py-2 font-semibold">Product Proposal</div>

        {/* Client info */}
        <div className="px-4 py-3 grid grid-cols-[180px_1fr] gap-y-1 text-sm">
          <div className="font-medium">Date</div><div>{today}</div>
          <div className="font-medium">Client Name</div><div>{client?.name || ''}</div>
          <div className="font-medium">Phone</div><div>{client?.phone_no || ''}</div>
          <div className="font-medium">Point of Contact</div><div>{client?.poc_name || ''}</div>
        </div>

        {/* Proposal table — all catalog fields */}
        <table className="w-full text-sm border-t border-black/10">
          <thead>
            <tr className="bg-mustard text-black">
              <th className="text-left px-3 py-2 whitespace-nowrap">Body Part</th>
              <th className="text-left px-3 py-2 whitespace-nowrap">Product Type</th>
              <th className="text-left px-3 py-2 whitespace-nowrap">Sub Product Type</th>
              <th className="text-left px-3 py-2 whitespace-nowrap">Key Benefits</th>
              <th className="text-left px-3 py-2 whitespace-nowrap">Specific Ingredients</th>
              <th className="text-left px-3 py-2 whitespace-nowrap">Color</th>
              <th className="text-left px-3 py-2 whitespace-nowrap">Fragrance</th>
              <th className="text-left px-3 py-2 whitespace-nowrap">Size</th>
              <th className="text-left px-3 py-2 whitespace-nowrap">Packaging</th>
              <th className="text-left px-3 py-2 whitespace-nowrap">Rate Category</th>
              <th className="text-right px-3 py-2 whitespace-nowrap">Per KG Rate</th>
              <th className="text-right px-3 py-2 whitespace-nowrap">Manufacturing Cost</th>
              <th className="text-right px-3 py-2 whitespace-nowrap">Rate Per Unit</th>
              <th className="text-right px-3 py-2 whitespace-nowrap">Tentative Packaging Cost</th>
              <th className="text-right px-3 py-2 whitespace-nowrap">Label Cost</th>
              <th className="text-right px-3 py-2 whitespace-nowrap">Tentative Monocarton Cost</th>
              <th className="text-right px-3 py-2 whitespace-nowrap">Total Cost</th>
              <th className="text-right px-3 py-2 whitespace-nowrap">Potential MRP</th>
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
        </table>
      </div>
    </section>
  )
}
