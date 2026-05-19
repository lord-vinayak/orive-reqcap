import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { catalogService, proposalService, requirementService } from '@/services'
import type { CatalogItem, Proposal, Requirement } from '@/types'

type Tab = 'edit' | 'preview' | 'export'

export default function ProposalPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('edit')
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [requirement, setRequirement] = useState<Requirement | null>(null)
  const [loading, setLoading] = useState(true)

  // Catalog search state
  const [facets, setFacets] = useState<{ body_parts: string[]; product_types: string[]; sub_product_types: string[]; key_benefits: string[] }>({
    body_parts: [], product_types: [], sub_product_types: [], key_benefits: [],
  })
  const [filters, setFilters] = useState({ body_part: '', product_type: '', sub_product_type: '', key_benefit: '', q: '' })
  const [results, setResults] = useState<CatalogItem[]>([])

  const load = async () => {
    if (!id) return
    const r = await requirementService.get(id)
    setRequirement(r)
    const p = await proposalService.getForRequirement(id)
    setProposal(p)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  // Load facets (refresh when body_part/product_type change)
  useEffect(() => {
    catalogService.facets({
      ...(filters.body_part ? { body_part: filters.body_part } : {}),
      ...(filters.product_type ? { product_type: filters.product_type } : {}),
    }).then(setFacets)
  }, [filters.body_part, filters.product_type])

  // Search results
  useEffect(() => {
    const params: Record<string, string> = {}
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
    catalogService.search(params).then(setResults)
  }, [filters])

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
    a.download = `Proposal_${requirement?.client_data?.name || 'client'}_${new Date().toISOString().slice(0,10)}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
    await load()  // refresh status / last_exported_at
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
              <select value={filters.body_part} onChange={(e) => setFilters((f) => ({ ...f, body_part: e.target.value, product_type: '', sub_product_type: '' }))}>
                <option value="">Body part —</option>
                {facets.body_parts.map((v) => <option key={v}>{v}</option>)}
              </select>
              <select value={filters.product_type} onChange={(e) => setFilters((f) => ({ ...f, product_type: e.target.value, sub_product_type: '' }))}>
                <option value="">Product type —</option>
                {facets.product_types.map((v) => <option key={v}>{v}</option>)}
              </select>
              <select value={filters.sub_product_type} onChange={(e) => setFilters((f) => ({ ...f, sub_product_type: e.target.value }))}>
                <option value="">Sub type —</option>
                {facets.sub_product_types.map((v) => <option key={v}>{v}</option>)}
              </select>
              <select value={filters.key_benefit} onChange={(e) => setFilters((f) => ({ ...f, key_benefit: e.target.value }))}>
                <option value="">Key benefit —</option>
                {facets.key_benefits.map((v) => <option key={v}>{v}</option>)}
              </select>
              <input
                placeholder="Free text search"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                className="col-span-2"
              />
            </div>
            <p className="text-xs text-black/50 mb-2">{results.length} results</p>
            <div className="overflow-x-auto max-h-[480px]">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>Body</th>
                    <th>Type</th>
                    <th>Sub</th>
                    <th>Benefits</th>
                    <th>Size</th>
                    <th>MRP</th>
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
                        <td>{c.potential_mrp ?? '—'}</td>
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


// Preview component
function ProposalPreview({ proposal, requirement }: { proposal: Proposal; requirement: Requirement }) {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const client = requirement.client_data
  return (
    <section className="card max-w-5xl">
      <p className="text-xs text-black/50 mb-3">Preview of the Excel that will be exported.</p>
      <div className="border border-black/15">
        {/* Logo row */}
        <div className="bg-mustard text-black font-bold text-center py-3 text-xl">
          SKINOVATION SCIENCES
        </div>
        {/* Header */}
        <div className="bg-mustard-50 text-center py-2 font-semibold">Product Proposal</div>
        {/* Date + client info */}
        <div className="px-4 py-3 grid grid-cols-[140px_1fr] gap-y-1 text-sm">
          <div className="font-medium">Date</div><div>{today}</div>
          <div className="font-medium">Client Name</div><div>{client?.name || ''}</div>
          <div className="font-medium">Phone</div><div>{client?.phone_no || ''}</div>
          <div className="font-medium">POC</div><div>{client?.poc_name || ''}</div>
        </div>
        {/* Table */}
        <table className="w-full text-sm border-t border-black/10">
          <thead>
            <tr className="bg-mustard text-black">
              <th className="text-left px-3 py-2">Body Part</th>
              <th className="text-left px-3 py-2">Product Type</th>
              <th className="text-left px-3 py-2">Sub Product Type</th>
              <th className="text-left px-3 py-2">Key Benefits</th>
              <th className="text-left px-3 py-2">Specific Ingredients</th>
              <th className="text-left px-3 py-2">Size</th>
              <th className="text-left px-3 py-2">Packaging</th>
              <th className="text-left px-3 py-2">Potential MRP</th>
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
                  <td className="px-3 py-2 border-t border-black/5">{kb}</td>
                  <td className="px-3 py-2 border-t border-black/5">{c.specific_ingredients}</td>
                  <td className="px-3 py-2 border-t border-black/5">{c.size}</td>
                  <td className="px-3 py-2 border-t border-black/5">{c.packaging_type}</td>
                  <td className="px-3 py-2 border-t border-black/5">{c.potential_mrp ?? ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
