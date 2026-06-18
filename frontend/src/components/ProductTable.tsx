import { useId } from 'react'
import type { RequirementProduct } from '@/types'
import {
  BODY_PARTS, CATEGORIES, SUB_CATEGORIES, SIZES, PACKAGING,
} from '@/utils/dropdownOptions'
import KeyBenefitsCell from './KeyBenefitsCell'

/**
 * Fields that are MANDATORY in every product row.
 * (Item #8 — chosen by user, has_color + has_fragrance also required.)
 */
export const REQUIRED_PRODUCT_FIELDS: (keyof RequirementProduct)[] = [
  'body_part', 'category', 'sub_category', 'size', 'packaging_type',
]

/** Returns the list of human-readable error messages for a single product row. */
export function validateProductRow(p: RequirementProduct): string[] {
  const errors: string[] = []
  if (!p.body_part?.trim())      errors.push('Body part is required')
  if (!p.category?.trim())       errors.push('Category is required')
  if (!p.sub_category?.trim())   errors.push('Texture is required')
  if (!p.key_benefits || p.key_benefits.length === 0) errors.push('At least one Key benefit is required')
  if (!p.size?.trim())           errors.push('Size is required')
  if (!p.packaging_type?.trim()) errors.push('Packaging type is required')
  if (!p.packaging_notes?.trim()) errors.push('Packaging notes is required')
  if (p.planned_mrp === null || p.planned_mrp === undefined) errors.push('Planned MRP is required')
  if (!p.specific_ingredient?.trim()) errors.push('Specific ingredient is required')
  if (!p.benchmark_product?.trim()) errors.push('Benchmark is required')
  if (p.has_color === null)      errors.push('Color (Yes/No) is required')
  if (p.has_color === true && !p.color_details?.trim()) errors.push('Color details is required')
  if (p.has_fragrance === null)  errors.push('Fragrance (Yes/No) is required')
  if (p.has_fragrance === true && !p.fragrance_details?.trim()) errors.push('Fragrance details is required')
  return errors
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
  /** Whether to surface missing-field errors visually (set after a save attempt). */
  showValidation?: boolean
  /**
   * Optional per-row "Add to Client Costing" handler.
   * When provided, each row gets a button that adds that row's data as a freeform costing item.
   */
  onAddRowToCosting?: (index: number) => Promise<void> | void
  /** Index currently being added to the costing (for showing a spinner). */
  addingRowToCostingIndex?: number | null
  /** Opens the notes modal — only provided when requirement is saved. */
  onAddNote?: () => void
  /** Opens the file upload modal — only provided when requirement is saved. */
  onAddImage?: () => void
}

/**
 * Excel-sheet style table of product rows.
 * Dropdown fields support free-text entry via <datalist> — user can type
 * any value not in the list (item #11).
 */
export default function ProductTable({
  products, onChange, onDelete, onAddRow, onInsertAfter,
  activeIndex, onActiveChange,
  showValidation = false,
  onAddRowToCosting, addingRowToCostingIndex = null,
  onAddNote, onAddImage,
}: Props) {
  // Unique datalist IDs so multiple ProductTables on a page don't collide.
  const uid = useId().replace(/:/g, '')
  const dlBody = `dl-body-${uid}`
  const dlCat = `dl-cat-${uid}`
  const dlSize = `dl-size-${uid}`
  const dlPack = `dl-pack-${uid}`

  return (
    <section className="card p-0 overflow-hidden" aria-labelledby="products-heading">
      <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
        <div>
          <h2 id="products-heading" className="text-lg font-semibold">Product details</h2>
          <p className="text-xs text-black/60 dark:text-slate-400 mt-0.5">
            All fields marked <abbr title="required" aria-label="required">*</abbr> are required
          </p>
        </div>
        <span className="text-xs text-black/60 dark:text-slate-300">{products.length} row{products.length === 1 ? '' : 's'}</span>
      </div>

      {/* Shared <datalist>s — provide suggestions while still allowing free text */}
      <datalist id={dlBody}>{BODY_PARTS.map((b) => <option key={b} value={b} />)}</datalist>
      <datalist id={dlCat}>{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id={dlSize}>{SIZES.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id={dlPack}>{PACKAGING.map((p) => <option key={p} value={p} />)}</datalist>

      <div className="overflow-x-auto min-h-[220px]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-mustard-50 dark:bg-slate-700 text-black/80 dark:text-slate-300 text-xs">
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 w-10">#</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[110px]">Body part *</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[120px]">Category *</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[140px]">Texture *</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[170px]">Key benefits *</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[80px]">Size *</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[100px]">Packaging *</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[160px]">Packaging Notes *</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[110px]">Planned MRP *</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[180px]">Specific ingredient *</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[160px]">Benchmark *</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[90px]">Color *</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[160px]">Color details <span className="text-black/50 dark:text-slate-400 text-[10px]">(if Yes)</span> *</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[90px]">Fragrance *</th>
              <th scope="col" className="px-2 py-2 text-left font-medium border-b border-black/10 dark:border-white/10 min-w-[160px]">Fragrance details <span className="text-black/50 dark:text-slate-400 text-[10px]">(if Yes)</span> *</th>
              <th scope="col" className="px-2 py-2 text-center font-medium border-b border-black/10 dark:border-white/10 w-28"><span className="sr-only">Row actions</span></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => {
              const subOptions = p.category && SUB_CATEGORIES[p.category] ? SUB_CATEGORIES[p.category] : []
              const dlSub = `dl-sub-${uid}-${i}`
              const isActive = activeIndex === i

              const rowErrors = showValidation ? validateProductRow(p) : []
              const invalid = (cond: boolean) => (showValidation && cond ? 'border-red-400 bg-red-50/40' : '')

              const cellCls = 'px-2 py-1 border-b border-black/5 dark:border-white/5 align-middle'
              const inputCls =
                'w-full px-2 py-1 text-sm border border-transparent rounded bg-transparent dark:text-slate-100 hover:bg-mustard-50/40 dark:hover:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-700 focus:border-mustard'

              return (
                <tr
                  key={p.id}
                  onClick={() => onActiveChange?.(i)}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActiveChange?.(i) } }}
                  className={isActive ? 'bg-mustard-50/40 dark:bg-slate-700/40' : ''}
                >
                  <td className={`${cellCls} text-center text-black/60 dark:text-slate-300 font-medium`}>{p.row_number}</td>

                  {/* Body part — free-text + datalist */}
                  <td className={cellCls}>
                    <input
                      list={dlBody}
                      value={p.body_part}
                      onChange={(e) => onChange(i, { body_part: e.target.value, key_benefits: [] })}
                      className={`${inputCls} ${invalid(!p.body_part?.trim())}`}
                      aria-label={`Row ${p.row_number} body part`}
                      aria-invalid={showValidation && !p.body_part?.trim() ? true : undefined}
                      aria-required="true"
                      placeholder="Type or pick…"
                    />
                  </td>

                  {/* Category */}
                  <td className={cellCls}>
                    <input
                      list={dlCat}
                      value={p.category}
                      onChange={(e) => onChange(i, { category: e.target.value, sub_category: '' })}
                      className={`${inputCls} ${invalid(!p.category?.trim())}`}
                      aria-label={`Row ${p.row_number} category`}
                      aria-invalid={showValidation && !p.category?.trim() ? true : undefined}
                      aria-required="true"
                      placeholder="Type or pick…"
                    />
                  </td>

                  {/* Sub category */}
                  <td className={cellCls}>
                    <datalist id={dlSub}>{subOptions.map((s) => <option key={s} value={s} />)}</datalist>
                    <input
                      list={dlSub}
                      value={p.sub_category}
                      onChange={(e) => onChange(i, { sub_category: e.target.value })}
                      className={`${inputCls} ${invalid(!p.sub_category?.trim())}`}
                      aria-label={`Row ${p.row_number} texture`}
                      aria-invalid={showValidation && !p.sub_category?.trim() ? true : undefined}
                      aria-required="true"
                      placeholder="Type or pick…"
                    />
                  </td>

                  <td className={cellCls}>
                    <div className={invalid(!p.key_benefits || p.key_benefits.length === 0) ? 'rounded border border-red-400 bg-red-50/40' : ''}>
                      <KeyBenefitsCell
                        bodyPart={p.body_part}
                        value={p.key_benefits || []}
                        onChange={(next) => onChange(i, { key_benefits: next })}
                      />
                    </div>
                  </td>

                  {/* Size */}
                  <td className={cellCls}>
                    <input
                      list={dlSize}
                      value={p.size}
                      onChange={(e) => onChange(i, { size: e.target.value })}
                      className={`${inputCls} ${invalid(!p.size?.trim())}`}
                      aria-label={`Row ${p.row_number} size`}
                      aria-invalid={showValidation && !p.size?.trim() ? true : undefined}
                      aria-required="true"
                      placeholder="Type or pick…"
                    />
                  </td>

                  {/* Packaging */}
                  <td className={cellCls}>
                    <input
                      list={dlPack}
                      value={p.packaging_type}
                      onChange={(e) => onChange(i, { packaging_type: e.target.value })}
                      className={`${inputCls} ${invalid(!p.packaging_type?.trim())}`}
                      aria-label={`Row ${p.row_number} packaging`}
                      aria-invalid={showValidation && !p.packaging_type?.trim() ? true : undefined}
                      aria-required="true"
                      placeholder="Type or pick…"
                    />
                  </td>

                  <td className={cellCls}>
                    <input
                      value={p.packaging_notes}
                      onChange={(e) => onChange(i, { packaging_notes: e.target.value })}
                      className={`${inputCls} ${invalid(!p.packaging_notes?.trim())}`}
                      aria-label={`Row ${p.row_number} packaging notes`}
                      aria-required="true"
                      aria-invalid={showValidation && !p.packaging_notes?.trim() ? true : undefined}
                    />
                  </td>

                  <td className={cellCls}>
                    <input
                      type="number"
                      value={p.planned_mrp ?? ''}
                      onChange={(e) => onChange(i, { planned_mrp: e.target.value ? Number(e.target.value) : null })}
                      className={`${inputCls} ${invalid(p.planned_mrp === null || p.planned_mrp === undefined)}`}
                      aria-label={`Row ${p.row_number} planned MRP`}
                      aria-required="true"
                      aria-invalid={showValidation && (p.planned_mrp === null || p.planned_mrp === undefined) ? true : undefined}
                    />
                  </td>

                  <td className={cellCls}>
                    <input
                      value={p.specific_ingredient}
                      onChange={(e) => onChange(i, { specific_ingredient: e.target.value })}
                      className={`${inputCls} ${invalid(!p.specific_ingredient?.trim())}`}
                      aria-label={`Row ${p.row_number} specific ingredient`}
                      aria-required="true"
                      aria-invalid={showValidation && !p.specific_ingredient?.trim() ? true : undefined}
                    />
                  </td>

                  <td className={cellCls}>
                    <input
                      value={p.benchmark_product}
                      onChange={(e) => onChange(i, { benchmark_product: e.target.value })}
                      className={`${inputCls} ${invalid(!p.benchmark_product?.trim())}`}
                      aria-label={`Row ${p.row_number} benchmark`}
                      aria-required="true"
                      aria-invalid={showValidation && !p.benchmark_product?.trim() ? true : undefined}
                    />
                  </td>

                  {/* Color Yes/No */}
                  <td className={cellCls}>
                    <select
                      value={p.has_color === null ? '' : p.has_color ? 'yes' : 'no'}
                      onChange={(e) => onChange(i, {
                        has_color: e.target.value === '' ? null : e.target.value === 'yes',
                      })}
                      className={`${inputCls} ${invalid(p.has_color === null)}`}
                      aria-label={`Row ${p.row_number} color`}
                      aria-invalid={showValidation && p.has_color === null ? true : undefined}
                      aria-required="true"
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
                      className={`${inputCls} ${p.has_color === true ? invalid(!p.color_details?.trim()) : ''}`}
                      aria-label={`Row ${p.row_number} color details`}
                      aria-required={p.has_color === true ? 'true' : 'false'}
                      aria-invalid={showValidation && p.has_color === true && !p.color_details?.trim() ? true : undefined}
                    />
                  </td>

                  {/* Fragrance Yes/No */}
                  <td className={cellCls}>
                    <select
                      value={p.has_fragrance === null ? '' : p.has_fragrance ? 'yes' : 'no'}
                      onChange={(e) => onChange(i, {
                        has_fragrance: e.target.value === '' ? null : e.target.value === 'yes',
                      })}
                      className={`${inputCls} ${invalid(p.has_fragrance === null)}`}
                      aria-label={`Row ${p.row_number} fragrance`}
                      aria-invalid={showValidation && p.has_fragrance === null ? true : undefined}
                      aria-required="true"
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
                      className={`${inputCls} ${p.has_fragrance === true ? invalid(!p.fragrance_details?.trim()) : ''}`}
                      aria-label={`Row ${p.row_number} fragrance details`}
                      aria-required={p.has_fragrance === true ? 'true' : 'false'}
                      aria-invalid={showValidation && p.has_fragrance === true && !p.fragrance_details?.trim() ? true : undefined}
                    />
                  </td>

                  {/* + / − / Costing action buttons */}
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
                      {onAddRowToCosting && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onAddRowToCosting(i) }}
                          disabled={addingRowToCostingIndex === i || rowErrors.length > 0}
                          className="px-2 h-6 flex items-center justify-center rounded border border-mustard-400 text-mustard-700 hover:bg-mustard-50 text-xs font-medium leading-none disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Add row ${p.row_number} to Client Costing`}
                          title={rowErrors.length > 0 ? 'Fill required fields first' : 'Add this row to Client Costing'}
                        >
                          {addingRowToCostingIndex === i ? '…' : '→Cost'}
                        </button>
                      )}
                    </div>
                    {showValidation && rowErrors.length > 0 && (
                      <p role="alert" className="text-xs text-red-700 mt-1 text-left">
                        {rowErrors.join('; ')}
                      </p>
                    )}
                  </td>
                </tr>
              )
            })}

            {products.length === 0 && (
              <tr>
                <td colSpan={16} className="text-center text-sm text-black/60 dark:text-slate-300 py-6">
                  No product rows yet. Click "+ Add row" below to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-black/10 dark:border-white/10 bg-white dark:bg-slate-800 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddRow}
          className="btn-secondary text-sm"
        >
          + Add row
        </button>
        {onAddNote && (
          <button
            type="button"
            onClick={onAddNote}
            className="btn-secondary text-sm"
            aria-label="Add a note for this requirement"
          >
            + Add note
          </button>
        )}
        {onAddImage && (
          <button
            type="button"
            onClick={onAddImage}
            className="btn-secondary text-sm"
            aria-label="Upload a file for this requirement"
          >
            + Add file
          </button>
        )}
      </div>
    </section>
  )
}
