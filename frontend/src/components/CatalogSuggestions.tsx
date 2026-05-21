import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { catalogService, proposalService } from '@/services'
import type { CatalogItem, ProposalItem, RequirementProduct } from '@/types'
import { BODY_PARTS, CATEGORIES, SUB_CATEGORIES, KEY_BENEFITS } from '@/utils/dropdownOptions'

interface Props {
  /** All current product rows. */
  products: RequirementProduct[]
  /** Index of the currently highlighted/active row in the product table. */
  activeRowIndex: number
  /** ID of the saved requirement; needed to find/create the proposal when adding items. */
  requirementId: string | undefined
  /**
   * Called when the user tries to add items but the requirement isn't saved yet.
   * Should trigger a save and return the new requirement ID (or null on failure).
   */
  onAutoSave?: () => Promise<string | null>
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

export default function CatalogSuggestions({
  products,
  activeRowIndex,
  requirementId,
  onAutoSave,
}: Props) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [results, setResults] = useState<CatalogItem[]>([])

  // Checkbox multi-select
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  // Proposal items already added
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([])
  const [proposalId, setProposalId] = useState<string | null>(null)
  const [proposalLoading, setProposalLoading] = useState(false)
  const [addingSelected, setAddingSelected] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  // Key Benefits dropdown (for filter bar)
  const [kbOpen, setKbOpen] = useState(false)
  const kbWrapRef = useRef<HTMLDivElement>(null)
  const kbBtnRef = useRef<HTMLButtonElement>(null)
  const kbDropRef = useRef<HTMLDivElement>(null)
  const [kbDropStyle, setKbDropStyle] = useState<React.CSSProperties>({})

  // Derived: set of catalog item IDs already in proposal
  const addedCatalogIds = new Set(proposalItems.map((it) => it.catalog_item))

  // ---------- Load proposal when requirementId is available ----------
  const loadProposal = async (reqId: string) => {
    setProposalLoading(true)
    try {
      const p = await proposalService.getForRequirement(reqId)
      setProposalId(p.id)
      setProposalItems(p.items)
    } catch {
      // No proposal yet — that's fine
    } finally {
      setProposalLoading(false)
    }
  }

  useEffect(() => {
    if (requirementId) loadProposal(requirementId)
    else { setProposalItems([]); setProposalId(null) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirementId])

  // ---------- Sync filters from the active (highlighted) product row ----------
  useEffect(() => {
    const row = products[activeRowIndex]
    if (!row || (!row.body_part && !row.category && !(row.key_benefits?.length))) {
      setFilters(EMPTY_FILTERS)
      return
    }
    const bp = row.body_part || ''
    const validKbs = bp ? (KEY_BENEFITS[bp] || []) : []
    const kbs = (row.key_benefits ?? []).filter((kb) => !validKbs.length || validKbs.includes(kb))
    setFilters({
      body_part: bp,
      product_type: row.category || '',
      sub_product_type: row.sub_category || '',
      key_benefits: kbs,
      rate_category: '',
      q: '',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeRowIndex,
    products[activeRowIndex]?.body_part,
    products[activeRowIndex]?.category,
    products[activeRowIndex]?.sub_category,
    JSON.stringify(products[activeRowIndex]?.key_benefits),
  ])

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
    // Reset checkboxes when filters change so stale selections don't persist
    setCheckedIds(new Set())
  }, [filters])

  // ---------- Close KB dropdown on outside click or Escape ----------
  useEffect(() => {
    if (!kbOpen) return
    const handleMouse = (e: MouseEvent) => {
      const t = e.target as Node
      if (kbWrapRef.current?.contains(t) || kbDropRef.current?.contains(t)) return
      setKbOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setKbOpen(false)
        kbBtnRef.current?.focus()
      }
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
      setKbDropStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: rect.width,
        zIndex: 9999,
      })
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

  // ---------- Checkbox toggle ----------
  const toggleCheck = (id: string) =>
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () => {
    const available = results.filter((r) => !addedCatalogIds.has(r.id)).map((r) => r.id)
    const allChecked = available.every((id) => checkedIds.has(id))
    setCheckedIds(allChecked ? new Set() : new Set(available))
  }

  // ---------- Add selected items to proposal ----------
  const handleAddSelected = async () => {
    if (checkedIds.size === 0) return
    setAddingSelected(true)
    setFeedback('')
    try {
      let reqId = requirementId
      if (!reqId) {
        if (!onAutoSave) {
          setFeedback('Save the requirement first to add items to the proposal.')
          setTimeout(() => setFeedback(''), 3000)
          return
        }
        setFeedback('Saving requirement…')
        reqId = (await onAutoSave()) ?? undefined
        if (!reqId) {
          setFeedback('Could not save. Fill in client name and phone first.')
          setTimeout(() => setFeedback(''), 4000)
          return
        }
      }

      // Ensure proposal exists
      let pid = proposalId
      if (!pid) {
        const p = await proposalService.getForRequirement(reqId)
        pid = p.id
        setProposalId(pid)
      }

      const toAdd = Array.from(checkedIds).filter((id) => !addedCatalogIds.has(id))
      for (const catalogItemId of toAdd) {
        await proposalService.addItem(pid, catalogItemId)
      }

      setCheckedIds(new Set())
      await loadProposal(reqId)
      setFeedback(`${toAdd.length} item${toAdd.length === 1 ? '' : 's'} added to proposal.`)
      setTimeout(() => setFeedback(''), 3000)
    } catch {
      setFeedback('Could not add items. Please try again.')
      setTimeout(() => setFeedback(''), 3000)
    } finally {
      setAddingSelected(false)
    }
  }

  // ---------- Remove item from proposal ----------
  const handleRemove = async (proposalItemId: string) => {
    setRemovingId(proposalItemId)
    try {
      await proposalService.removeItem(proposalItemId)
      if (requirementId) await loadProposal(requirementId)
    } catch {
      setFeedback('Could not remove item.')
      setTimeout(() => setFeedback(''), 3000)
    } finally {
      setRemovingId(null)
    }
  }

  // How many available (not-yet-added) items are checked
  const availableResults = results.filter((r) => !addedCatalogIds.has(r.id))
  const allAvailableChecked =
    availableResults.length > 0 && availableResults.every((r) => checkedIds.has(r.id))

  const thCls =
    'px-3 py-2 text-left text-xs font-medium border-b border-black/10 dark:border-white/10 bg-mustard-50 dark:bg-slate-700 text-black/80 dark:text-slate-300 whitespace-nowrap'

  return (
    <>
      {/* ======= Matching catalog items ======= */}
      <section
        className="card p-0 overflow-hidden"
        aria-labelledby="catalog-suggestions-heading"
      >
        <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between flex-wrap gap-3">
          <h2 id="catalog-suggestions-heading" className="text-lg font-semibold">
            Matching catalog items
          </h2>
          {checkedIds.size > 0 && (
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={addingSelected}
              className="btn-primary text-sm"
              aria-live="polite"
            >
              {addingSelected
                ? 'Adding…'
                : `Add ${checkedIds.size} selected to proposal`}
            </button>
          )}
        </div>

        {/* ---- Horizontal filter bar ---- */}
        <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.03] flex flex-wrap gap-3 items-end">
          {/* Body Part */}
          <div className="flex flex-col gap-1 min-w-[110px]">
            <label className="text-xs font-medium text-black/60 dark:text-slate-400">
              Body Part
            </label>
            <select
              value={filters.body_part}
              onChange={(e) => {
                const bp = e.target.value
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
              {BODY_PARTS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Product Type */}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <label className="text-xs font-medium text-black/60 dark:text-slate-400">
              Product Type
            </label>
            <select
              value={filters.product_type}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  product_type: e.target.value,
                  sub_product_type: '',
                }))
              }
              className="text-sm"
            >
              <option value="">All</option>
              {CATEGORIES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Sub Product Type */}
          <div className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-xs font-medium text-black/60 dark:text-slate-400">
              Sub Product Type
            </label>
            <select
              value={filters.sub_product_type}
              onChange={(e) =>
                setFilters((f) => ({ ...f, sub_product_type: e.target.value }))
              }
              className="text-sm"
              disabled={!filters.product_type}
            >
              <option value="">All</option>
              {(filters.product_type
                ? SUB_CATEGORIES[filters.product_type] || []
                : []
              ).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Key Benefits multi-select */}
          <div className="flex flex-col gap-1 min-w-[160px]" ref={kbWrapRef}>
            <label className="text-xs font-medium text-black/60 dark:text-slate-400">
              Key Benefits
            </label>
            <button
              ref={kbBtnRef}
              type="button"
              onClick={openKbDrop}
              aria-haspopup="true"
              aria-expanded={kbOpen}
              className="text-sm text-left px-2 py-1 border border-black/15 dark:border-white/15 rounded bg-white dark:bg-slate-800 dark:text-slate-100 truncate hover:border-mustard"
            >
              {filters.key_benefits.length === 0
                ? 'All'
                : filters.key_benefits.join(', ')}
            </button>
            {kbOpen &&
              createPortal(
                <div
                  ref={kbDropRef}
                  role="group"
                  aria-label="Key benefits options"
                  style={kbDropStyle}
                  className="max-h-52 overflow-auto bg-white dark:bg-slate-800 border border-black/15 dark:border-white/15 rounded shadow-lg p-2"
                >
                  {(() => {
                    const options = filters.body_part
                      ? KEY_BENEFITS[filters.body_part] || []
                      : Array.from(
                          new Set(
                            results
                              .flatMap((r) => [r.kb_tag1, r.kb_tag2, r.kb_tag3])
                              .filter(Boolean)
                          )
                        )
                    return options.length === 0 ? (
                      <p className="text-xs text-black/60 dark:text-slate-400 px-2 py-1">
                        No options available.
                      </p>
                    ) : (
                      options.map((kb) => (
                        <label
                          key={kb}
                          className="flex items-center gap-2 px-2 py-1 hover:bg-mustard-50 dark:hover:bg-slate-700 rounded cursor-pointer text-sm dark:text-slate-100"
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
                    )
                  })()}
                </div>,
                document.body
              )}
          </div>

          {/* Rate Category */}
          <div className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-xs font-medium text-black/60 dark:text-slate-400">
              Rate Category
            </label>
            <select
              value={filters.rate_category}
              onChange={(e) =>
                setFilters((f) => ({ ...f, rate_category: e.target.value }))
              }
              className="text-sm"
            >
              <option value="">All</option>
              {RATE_CATEGORIES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Free text search */}
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs font-medium text-black/60 dark:text-slate-400">
              Search
            </label>
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
          <div
            role="status"
            aria-live="polite"
            className="px-4 py-2 text-sm bg-mustard-50 dark:bg-slate-700 border-b border-mustard/30 dark:border-mustard/20 text-black/80 dark:text-slate-100"
          >
            {feedback}
          </div>
        )}

        {/* ---- Results table ---- */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {/* Select-all checkbox */}
                <th scope="col" className={`${thCls} w-10 text-center`}>
                  <input
                    type="checkbox"
                    className="accent-mustard"
                    checked={allAvailableChecked}
                    onChange={toggleAll}
                    aria-label="Select all available items"
                    disabled={availableResults.length === 0}
                  />
                </th>
                <th scope="col" className={`${thCls} min-w-[100px]`}>Body Part</th>
                <th scope="col" className={`${thCls} min-w-[110px]`}>Product Type</th>
                <th scope="col" className={`${thCls} min-w-[130px]`}>Sub Product Type</th>
                <th scope="col" className={`${thCls} min-w-[160px]`}>Key Benefits</th>
                <th scope="col" className={`${thCls} min-w-[60px]`}>Size</th>
                <th scope="col" className={`${thCls} min-w-[90px]`}>Packaging</th>
                <th scope="col" className={`${thCls} min-w-[100px]`}>Rate Category</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center text-sm text-black/60 dark:text-slate-400 py-8"
                  >
                    No matching catalog items found.
                  </td>
                </tr>
              )}
              {results.map((item) => {
                const kb = [item.kb_tag1, item.kb_tag2, item.kb_tag3]
                  .filter(Boolean)
                  .join(', ')
                const isAdded = addedCatalogIds.has(item.id)
                const isChecked = checkedIds.has(item.id)

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-black/5 dark:border-white/5 ${
                      isAdded
                        ? 'bg-mustard-50/60 dark:bg-mustard-900/20 opacity-60'
                        : isChecked
                        ? 'bg-mustard-50 dark:bg-slate-700/50'
                        : 'hover:bg-mustard-50/20 dark:hover:bg-slate-700/20'
                    }`}
                  >
                    <td className="px-3 py-2 text-center">
                      {isAdded ? (
                        <span
                          className="text-mustard-600 dark:text-mustard-400 text-xs font-medium"
                          aria-label="Already in proposal"
                          title="Already in proposal"
                        >
                          ✓
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          className="accent-mustard"
                          checked={isChecked}
                          onChange={() => toggleCheck(item.id)}
                          aria-label={`Select ${item.body_part} ${item.product_type}`}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 dark:text-slate-200">{item.body_part}</td>
                    <td className="px-3 py-2 dark:text-slate-200">{item.product_type}</td>
                    <td className="px-3 py-2 dark:text-slate-200">{item.sub_product_type}</td>
                    <td className="px-3 py-2 text-xs dark:text-slate-300">{kb || '—'}</td>
                    <td className="px-3 py-2 dark:text-slate-200">{item.size || '—'}</td>
                    <td className="px-3 py-2 dark:text-slate-200">{item.packaging_type || '—'}</td>
                    <td className="px-3 py-2 dark:text-slate-200">{item.rate_category || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 border-t border-black/10 dark:border-white/10 text-xs text-black/60 dark:text-slate-400 flex items-center justify-between">
          <span>
            {results.length} result{results.length === 1 ? '' : 's'}
          </span>
          {checkedIds.size > 0 && (
            <span className="text-mustard-700 dark:text-mustard-400 font-medium">
              {checkedIds.size} selected
            </span>
          )}
        </div>
      </section>

      {/* ======= Items already in proposal ======= */}
      <section
        className="card p-0 overflow-hidden"
        aria-labelledby="proposal-items-heading"
      >
        <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <h2 id="proposal-items-heading" className="text-lg font-semibold">
            Items in proposal
          </h2>
          <span className="text-xs text-black/60 dark:text-slate-400">
            {proposalLoading
              ? 'Loading…'
              : `${proposalItems.length} item${proposalItems.length === 1 ? '' : 's'}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th scope="col" className={`${thCls} w-8 text-center`}>#</th>
                <th scope="col" className={`${thCls} min-w-[100px]`}>Body Part</th>
                <th scope="col" className={`${thCls} min-w-[110px]`}>Product Type</th>
                <th scope="col" className={`${thCls} min-w-[130px]`}>Sub Product Type</th>
                <th scope="col" className={`${thCls} min-w-[160px]`}>Key Benefits</th>
                <th scope="col" className={`${thCls} min-w-[60px]`}>Size</th>
                <th scope="col" className={`${thCls} min-w-[90px]`}>Packaging</th>
                <th scope="col" className={`${thCls} min-w-[100px]`}>Rate Category</th>
                <th scope="col" className={`${thCls} w-20 text-center`}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {proposalItems.length === 0 && !proposalLoading && (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center text-sm text-black/60 dark:text-slate-400 py-8"
                  >
                    {requirementId
                      ? 'No items added yet. Select items above and click "Add selected to proposal".'
                      : 'Save the requirement first, then add items.'}
                  </td>
                </tr>
              )}
              {proposalItems.map((it, idx) => {
                const c = it.catalog_data
                const kb = [c.kb_tag1, c.kb_tag2, c.kb_tag3].filter(Boolean).join(', ')
                const isRemoving = removingId === it.id
                return (
                  <tr
                    key={it.id}
                    className={`border-b border-black/5 dark:border-white/5 ${
                      idx % 2 === 1
                        ? 'bg-black/[0.015] dark:bg-white/[0.02]'
                        : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-center text-black/50 dark:text-slate-500 font-medium text-xs">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 dark:text-slate-200">{c.body_part}</td>
                    <td className="px-3 py-2 dark:text-slate-200">{c.product_type}</td>
                    <td className="px-3 py-2 dark:text-slate-200">{c.sub_product_type}</td>
                    <td className="px-3 py-2 text-xs dark:text-slate-300">{kb || '—'}</td>
                    <td className="px-3 py-2 dark:text-slate-200">{c.size || '—'}</td>
                    <td className="px-3 py-2 dark:text-slate-200">{c.packaging_type || '—'}</td>
                    <td className="px-3 py-2 dark:text-slate-200">{c.rate_category || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemove(it.id)}
                        disabled={isRemoving}
                        className="btn-danger text-xs"
                        aria-label={`Remove ${c.body_part} ${c.product_type} from proposal`}
                      >
                        {isRemoving ? '…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
