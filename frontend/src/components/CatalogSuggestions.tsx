import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { catalogService, proposalService } from '@/services'
import type { CatalogItem, RequirementProduct } from '@/types'
import { BODY_PARTS, CATEGORIES, SUB_CATEGORIES, KEY_BENEFITS } from '@/utils/dropdownOptions'

interface Props {
  /** All current product rows — used to auto-derive filters from the latest row. */
  products: RequirementProduct[]
  /** ID of the saved requirement; needed to find/create the proposal when adding items. */
  requirementId: string | undefined
}

type Filters = {
  body_part: string
  product_type: string
  sub_product_type: string
  key_benefits: string[]
  rate_category: string
  q: string
}

const EMPTY_FILTERS: Filters = {
  body_part: '',
  product_type: '',
  sub_product_type: '',
  key_benefits: [],
  rate_category: '',
  q: '',
}

const RATE_CATEGORIES = ['Basic', 'Premium', 'Luxury']

function fmt(val: number | null | undefined) {
  if (val === null || val === undefined || val === 0) return '—'
  return `₹${Number(val).toLocaleString('en-IN')}`
}

export default function CatalogSuggestions({ products, requirementId }: Props) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [results, setResults] = useState<CatalogItem[]>([])
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [addingId, setAddingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [kbOpen, setKbOpen] = useState(false)
  const kbWrapRef = useRef<HTMLDivElement>(null)
  const kbDropRef = useRef<HTMLDivElement>(null)
  const [kbDropStyle, setKbDropStyle] = useState<React.CSSProperties>({})

  // ---------- Auto-derive filters from the latest non-empty requirement row ----------
  useEffect(() => {
    const lastFilled = [...products].reverse().find(
      (p) => p.body_part || p.category || (p.key_benefits && p.key_benefits.length > 0)
    )
    if (!lastFilled) {
      setFilters(EMPTY_FILTERS)
      return
    }
    const newBodyPart = lastFilled.body_part || ''
    const newProductType = lastFilled.category || ''
    const validKbs = newBodyPart ? (KEY_BENEFITS[newBodyPart] || []) : []
    const newKbs = lastFilled.key_benefits?.length
      ? lastFilled.key_benefits.filter((kb) => !validKbs.length || validKbs.includes(kb))
      : []
    setFilters((prev) => ({
      ...prev,
      body_part: newBodyPart || prev.body_part,
      product_type: newProductType || prev.product_type,
      sub_product_type: lastFilled.sub_category || prev.sub_product_type,
      key_benefits: newKbs.length ? newKbs : (validKbs.length ? [] : prev.key_benefits),
    }))
  }, [products])

  // ---------- Search catalog whenever filters change ----------
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

  // ---------- Close KB dropdown on outside click ----------
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

  // ---------- Add item to proposal ----------
  const handleAdd = async (item: CatalogItem) => {
    if (!requirementId) {
      setFeedback('Save the requirement first to add items to the proposal.')
      setTimeout(() => setFeedback(''), 3000)
      return
    }
    setAddingId(item.id)
    try {
      const proposal = await proposalService.getForRequirement(requirementId)
      await proposalService.addItem(proposal.id, item.id)
      setAddedIds((prev) => new Set([...prev, item.id]))
      setFeedback(`Added "${item.body_part} – ${item.product_type}" to proposal.`)
      setTimeout(() => setFeedback(''), 3000)
    } catch {
      setFeedback('Could not add item. Please try again.')
      setTimeout(() => setFeedback(''), 3000)
    } finally {
      setAddingId(null)
    }
  }

  return (
    <section className="card p-0 overflow-hidden" aria-labelledby="catalog-suggestions-heading">
      <div className="px-4 py-3 border-b border-black/10">
        <h2 id="catalog-suggestions-heading" className="text-lg font-semibold">
          Matching catalog items
        </h2>
        <p className="text-xs text-black/50 mt-0.5">
          Automatically filtered from the catalog based on your latest product requirement. Use the filters below to refine.
        </p>
      </div>

      {/* ---- Horizontal filter bar ---- */}
      <div className="px-4 py-3 border-b border-black/10 bg-black/[0.015] flex flex-wrap gap-3 items-end">
        {/* Body Part */}
        <div className="flex flex-col gap-1 min-w-[110px]">
          <label className="text-xs font-medium text-black/60">Body Part</label>
          <select
            value={filters.body_part}
            onChange={(e) => {
              const bp = e.target.value
              // Reset key benefits that are not valid for the new body part
              const validKbs = bp ? (KEY_BENEFITS[bp] || []) : []
              setFilters((f) => ({
                ...f,
                body_part: bp,
                key_benefits: f.key_benefits.filter((kb) => validKbs.includes(kb)),
              }))
            }}
            className="text-sm"
          >
            <option value="">All</option>
            {BODY_PARTS.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>

        {/* Product Type — same vocabulary as the product table "Category" column */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="text-xs font-medium text-black/60">Product Type</label>
          <select
            value={filters.product_type}
            onChange={(e) => setFilters((f) => ({
              ...f,
              product_type: e.target.value,
              sub_product_type: '', // reset sub when category changes
            }))}
            className="text-sm"
          >
            <option value="">All</option>
            {CATEGORIES.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>

        {/* Sub Product Type — cascades from selected Product Type */}
        <div className="flex flex-col gap-1 min-w-[130px]">
          <label className="text-xs font-medium text-black/60">Sub Product Type</label>
          <select
            value={filters.sub_product_type}
            onChange={(e) => setFilters((f) => ({ ...f, sub_product_type: e.target.value }))}
            className="text-sm"
            disabled={!filters.product_type}
          >
            <option value="">All</option>
            {(filters.product_type ? (SUB_CATEGORIES[filters.product_type] || []) : []).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Key Benefits multi-select — options cascade from selected Body Part */}
        <div className="flex flex-col gap-1 min-w-[160px]" ref={kbWrapRef}>
          <label className="text-xs font-medium text-black/60">Key Benefits</label>
          <button
            type="button"
            onClick={openKbDrop}
            className="text-sm text-left px-2 py-1 border border-black/15 rounded bg-white truncate hover:border-mustard"
          >
            {filters.key_benefits.length === 0
              ? 'All'
              : filters.key_benefits.join(', ')}
          </button>
          {kbOpen && createPortal(
            <div
              ref={kbDropRef}
              style={kbDropStyle}
              className="max-h-52 overflow-auto bg-white border border-black/15 rounded shadow-lg p-2"
            >
              {(() => {
                // Show body-part-specific options when a body part is selected;
                // otherwise fall back to the full list from current results.
                const options = filters.body_part
                  ? (KEY_BENEFITS[filters.body_part] || [])
                  : Array.from(new Set(results.flatMap((r) => [r.kb_tag1, r.kb_tag2, r.kb_tag3].filter(Boolean))))
                return options.length === 0
                  ? <p className="text-xs text-black/50 px-2 py-1">No options available.</p>
                  : options.map((kb) => (
                    <label
                      key={kb}
                      className="flex items-center gap-2 px-2 py-1 hover:bg-mustard-50 rounded cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        className="accent-mustard"
                        checked={filters.key_benefits.includes(kb)}
                        onChange={() => toggleKb(kb)}
                      />
                      <span>{kb}</span>
                    </label>
                  ))
              })()}
            </div>,
            document.body,
          )}
        </div>

        {/* Rate Category */}
        <div className="flex flex-col gap-1 min-w-[130px]">
          <label className="text-xs font-medium text-black/60">Rate Category</label>
          <select
            value={filters.rate_category}
            onChange={(e) => setFilters((f) => ({ ...f, rate_category: e.target.value }))}
            className="text-sm"
          >
            <option value="">All</option>
            {RATE_CATEGORIES.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>

        {/* Free text search */}
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-black/60">Search</label>
          <input
            placeholder="Free text search…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            className="text-sm"
          />
        </div>

        {/* Reset */}
        <button
          type="button"
          onClick={() => setFilters(EMPTY_FILTERS)}
          className="btn-secondary text-xs self-end"
        >
          Reset filters
        </button>
      </div>

      {/* Feedback message */}
      {feedback && (
        <div className="px-4 py-2 text-sm bg-mustard-50 border-b border-mustard/30 text-black/80">
          {feedback}
        </div>
      )}

      {/* ---- Results table ---- */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-mustard-50 text-black/80 text-xs">
              <th className="px-3 py-2 text-left font-medium border-b border-black/10 min-w-[100px]">Body Part</th>
              <th className="px-3 py-2 text-left font-medium border-b border-black/10 min-w-[110px]">Product Type</th>
              <th className="px-3 py-2 text-left font-medium border-b border-black/10 min-w-[130px]">Sub Product Type</th>
              <th className="px-3 py-2 text-left font-medium border-b border-black/10 min-w-[160px]">Key Benefits</th>
              <th className="px-3 py-2 text-left font-medium border-b border-black/10 min-w-[60px]">Size</th>
              <th className="px-3 py-2 text-left font-medium border-b border-black/10 min-w-[90px]">Packaging</th>
              <th className="px-3 py-2 text-left font-medium border-b border-black/10 min-w-[100px]">Rate Category</th>
              <th className="px-3 py-2 text-right font-medium border-b border-black/10 min-w-[110px]">Per KG Rate</th>
              <th className="px-3 py-2 text-right font-medium border-b border-black/10 min-w-[110px]">Rate Per Unit</th>
              <th className="px-3 py-2 text-right font-medium border-b border-black/10 min-w-[130px]">Tentative Packaging Cost</th>
              <th className="px-3 py-2 text-right font-medium border-b border-black/10 min-w-[110px]">Total Cost</th>
              <th className="px-3 py-2 text-right font-medium border-b border-black/10 min-w-[110px]">Potential MRP</th>
              <th className="px-3 py-2 text-center font-medium border-b border-black/10 w-20">Add to Proposal</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 && (
              <tr>
                <td colSpan={13} className="text-center text-sm text-black/50 py-8">
                  No matching catalog items found.
                </td>
              </tr>
            )}
            {results.map((item) => {
              const kb = [item.kb_tag1, item.kb_tag2, item.kb_tag3].filter(Boolean).join(', ')
              const isAdded = addedIds.has(item.id)
              const isAdding = addingId === item.id
              return (
                <tr key={item.id} className="hover:bg-mustard-50/20 border-b border-black/5">
                  <td className="px-3 py-2">{item.body_part}</td>
                  <td className="px-3 py-2">{item.product_type}</td>
                  <td className="px-3 py-2">{item.sub_product_type}</td>
                  <td className="px-3 py-2 text-xs">{kb || '—'}</td>
                  <td className="px-3 py-2">{item.size || '—'}</td>
                  <td className="px-3 py-2">{item.packaging_type || '—'}</td>
                  <td className="px-3 py-2">{item.rate_category || '—'}</td>
                  <td className="px-3 py-2 text-right">{fmt(item.per_kg_rate)}</td>
                  <td className="px-3 py-2 text-right">{fmt(item.rate_per_unit)}</td>
                  <td className="px-3 py-2 text-right">{fmt(item.tentative_packaging_cost)}</td>
                  <td className="px-3 py-2 text-right">{fmt(item.total_cost)}</td>
                  <td className="px-3 py-2 text-right">{fmt(item.potential_mrp)}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      disabled={isAdded || isAdding}
                      onClick={() => handleAdd(item)}
                      className={
                        isAdded
                          ? 'btn-secondary text-xs opacity-60 cursor-not-allowed'
                          : 'btn-primary text-xs'
                      }
                      aria-label={`Add ${item.body_part} ${item.product_type} to proposal`}
                    >
                      {isAdded ? 'Added' : isAdding ? 'Adding…' : '+  Add'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-black/10 text-xs text-black/40">
        {results.length} result{results.length === 1 ? '' : 's'}
      </div>
    </section>
  )
}
