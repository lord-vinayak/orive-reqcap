import type { RequirementProduct } from '@/types'
import {
  BODY_PARTS, CATEGORIES, SUB_CATEGORIES, SIZES, PACKAGING,
} from '@/utils/dropdownOptions'
import KeyBenefitsCell from './KeyBenefitsCell'

/** Derives the rate category label from a planned MRP value. Read-only — cannot be edited. */
function getRateCategory(mrp: number | null): string {
  if (mrp === null || mrp <= 0) return '—'
  if (mrp <= 500)  return 'Basic Range'
  if (mrp <= 899)  return 'Premium Entry Range'
  if (mrp <= 1299) return 'Premium High-End Range'
  if (mrp < 2100)  return 'Luxury Entry Range'
  return 'Luxury High-End Range'
}

interface Props {
  products: RequirementProduct[]
  onChange: (index: number, patch: Partial<RequirementProduct>) => void
  onDelete: (index: number) => void
  onAddRow: () => void
  /** Insert a blank row immediately after the given index. */
  onInsertAfter: (index: number) => void
  /** Index of the row currently being edited (audio fills into this row). */
  activeIndex?: number
  onActiveChange?: (i: number) => void
}

/**
 * Excel-sheet style table of product rows.
 * One row per product, columns laid out horizontally.
 * Horizontal scroll for narrow viewports.
 */
export default function ProductTable({
  products, onChange, onDelete, onAddRow, onInsertAfter, activeIndex, onActiveChange,
}: Props) {
  return (
    <section className="card p-0 overflow-hidden" aria-labelledby="products-heading">
      <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
        <h2 id="products-heading" className="text-lg font-semibold">Product details</h2>
        <span className="text-xs text-black/60 dark:text-slate-400">{products.length} row{products.length === 1 ? '' : 's'}</span>
      </div>

      <div className="overflow-x-auto min-h-[220px]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-mustard-50 dark:bg-slate-700 text-black/80 dark:text-slate-300 text-xs">
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 w-10">#</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[110px]">Body part</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[120px]">Category</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[140px]">Sub category</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[170px]">Key benefits</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[80px]">Size</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[100px]">Packaging</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[160px]">Packaging Notes</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[110px]">Planned MRP</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[160px]">
                Rate Category
                <span className="sr-only"> (auto-computed from Planned MRP)</span>
              </th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[180px]">Specific ingredient</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[160px]">Benchmark</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[90px]">Color</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[160px]">Color details</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[90px]">Fragrance</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[160px]">Fragrance details</th>
              <th scope="col" className="px-2 py-2 text-center font-medium border-b border-black/10 dark:border-white/10 w-20"><span className="sr-only">Row actions</span></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => {
              const subOptions = p.category ? (SUB_CATEGORIES[p.category] || []) : []
              const isActive = activeIndex === i

              const cellCls = 'px-2 py-1 border-b border-black/5 dark:border-white/5 align-middle'
              const inputCls =
                'w-full px-2 py-1 text-sm border border-transparent rounded bg-transparent dark:text-slate-100 hover:bg-mustard-50/40 dark:hover:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-700 focus:border-mustard'

              return (
                <tr
                  key={p.id}
                  onClick={() => onActiveChange?.(i)}
                  className={isActive ? 'bg-mustard-50/40 dark:bg-slate-700/40' : ''}
                >
                  <td className={`${cellCls} text-center text-black/60 dark:text-slate-400 font-medium`}>{p.row_number}</td>

                  <td className={cellCls}>
                    <select
                      value={p.body_part}
                      onChange={(e) => onChange(i, { body_part: e.target.value, key_benefits: [] })}
                      className={inputCls}
                      aria-label={`Row ${p.row_number} body part`}
                    >
                      <option value="">—</option>
                      {BODY_PARTS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </td>

                  <td className={cellCls}>
                    <select
                      value={p.category}
                      onChange={(e) => onChange(i, { category: e.target.value, sub_category: '' })}
                      className={inputCls}
                      aria-label={`Row ${p.row_number} category`}
                    >
                      <option value="">—</option>
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </td>

                  <td className={cellCls}>
                    <select
                      value={p.sub_category}
                      onChange={(e) => onChange(i, { sub_category: e.target.value })}
                      disabled={!p.category}
                      className={inputCls}
                      aria-label={`Row ${p.row_number} sub category`}
                    >
                      <option value="">—</option>
                      {subOptions.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>

                  <td className={cellCls}>
                    <KeyBenefitsCell
                      bodyPart={p.body_part}
                      value={p.key_benefits || []}
                      onChange={(next) => onChange(i, { key_benefits: next })}
                    />
                  </td>

                  <td className={cellCls}>
                    <select
                      value={p.size}
                      onChange={(e) => onChange(i, { size: e.target.value })}
                      className={inputCls}
                      aria-label={`Row ${p.row_number} size`}
                    >
                      <option value="">—</option>
                      {SIZES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>

                  <td className={cellCls}>
                    <select
                      value={p.packaging_type}
                      onChange={(e) => onChange(i, { packaging_type: e.target.value })}
                      className={inputCls}
                      aria-label={`Row ${p.row_number} packaging`}
                    >
                      <option value="">—</option>
                      {PACKAGING.map((pk) => <option key={pk}>{pk}</option>)}
                    </select>
                  </td>

                  <td className={cellCls}>
                    <input
                      value={p.packaging_notes}
                      onChange={(e) => onChange(i, { packaging_notes: e.target.value })}
                      className={inputCls}
                      aria-label={`Row ${p.row_number} packaging notes`}
                    />
                  </td>

                  <td className={cellCls}>
                    <input
                      type="number"
                      value={p.planned_mrp ?? ''}
                      onChange={(e) => onChange(i, { planned_mrp: e.target.value ? Number(e.target.value) : null })}
                      className={inputCls}
                      aria-label={`Row ${p.row_number} planned MRP`}
                    />
                  </td>

                  <td className={cellCls}>
                    <span
                      className="block px-2 py-1 text-xs rounded bg-black/[0.04] dark:bg-white/[0.06] text-black/70 dark:text-slate-400 select-none"
                      aria-label={`Row ${p.row_number} rate category: ${getRateCategory(p.planned_mrp)}`}
                      aria-readonly="true"
                      title="Auto-computed from Planned MRP"
                    >
                      {getRateCategory(p.planned_mrp)}
                    </span>
                  </td>

                  <td className={cellCls}>
                    <input
                      value={p.specific_ingredient}
                      onChange={(e) => onChange(i, { specific_ingredient: e.target.value })}
                      className={inputCls}
                      aria-label={`Row ${p.row_number} specific ingredient`}
                    />
                  </td>

                  <td className={cellCls}>
                    <input
                      value={p.benchmark_product}
                      onChange={(e) => onChange(i, { benchmark_product: e.target.value })}
                      className={inputCls}
                      aria-label={`Row ${p.row_number} benchmark`}
                    />
                  </td>

                  <td className={cellCls}>
                    <select
                      value={p.has_color === null ? '' : p.has_color ? 'yes' : 'no'}
                      onChange={(e) => onChange(i, {
                        has_color: e.target.value === '' ? null : e.target.value === 'yes',
                      })}
                      className={inputCls}
                      aria-label={`Row ${p.row_number} color`}
                    >
                      <option value="">—</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </td>

                  <td className={cellCls}>
                    <input
                      value={p.color_details}
                      onChange={(e) => onChange(i, { color_details: e.target.value })}
                      disabled={p.has_color !== true}
                      className={inputCls}
                      aria-label={`Row ${p.row_number} color details`}
                    />
                  </td>

                  <td className={cellCls}>
                    <select
                      value={p.has_fragrance === null ? '' : p.has_fragrance ? 'yes' : 'no'}
                      onChange={(e) => onChange(i, {
                        has_fragrance: e.target.value === '' ? null : e.target.value === 'yes',
                      })}
                      className={inputCls}
                      aria-label={`Row ${p.row_number} fragrance`}
                    >
                      <option value="">—</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </td>

                  <td className={cellCls}>
                    <input
                      value={p.fragrance_details}
                      onChange={(e) => onChange(i, { fragrance_details: e.target.value })}
                      disabled={p.has_fragrance !== true}
                      className={inputCls}
                      aria-label={`Row ${p.row_number} fragrance details`}
                    />
                  </td>

                  {/* + / − action buttons */}
                  <td className={`${cellCls} text-center`}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onInsertAfter(i) }}
                        className="w-6 h-6 flex items-center justify-center rounded border border-black/20 text-black/70 hover:bg-mustard-50 hover:border-mustard text-base font-semibold leading-none"
                        aria-label={`Insert row after row ${p.row_number}`}
                        title="Insert row below"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(i) }}
                        className="w-6 h-6 flex items-center justify-center rounded border border-red-200 text-red-700 hover:bg-red-50 hover:border-red-400 text-base font-semibold leading-none"
                        aria-label={`Remove row ${p.row_number}`}
                        title="Remove row"
                      >
                        −
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {products.length === 0 && (
              <tr>
                <td colSpan={17} className="text-center text-sm text-black/60 dark:text-slate-400 py-6">
                  No product rows yet. Click "+ Add row" below to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-black/10 dark:border-white/10 bg-white dark:bg-slate-800">
        <button
          type="button"
          onClick={onAddRow}
          className="btn-secondary text-sm"
        >
          + Add row
        </button>
      </div>
    </section>
  )
}
