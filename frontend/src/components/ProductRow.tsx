import type { RequirementProduct } from '@/types'
import {
  BODY_PARTS, CATEGORIES, SUB_CATEGORIES, KEY_BENEFITS, SIZES, PACKAGING,
} from '@/utils/dropdownOptions'

interface Props {
  product: RequirementProduct
  onChange: (next: Partial<RequirementProduct>) => void
  onDelete: () => void
}

export default function ProductRow({ product, onChange, onDelete }: Props) {
  const subOptions = product.category ? (SUB_CATEGORIES[product.category] || []) : []
  const kbOptions = product.body_part ? (KEY_BENEFITS[product.body_part] || []) : []

  const toggleKB = (kb: string) => {
    const cur = product.key_benefits || []
    const next = cur.includes(kb) ? cur.filter((x) => x !== kb) : [...cur, kb]
    onChange({ key_benefits: next })
  }

  return (
    <div className="border border-black/10 rounded p-4 mb-3 bg-white" role="group" aria-label={`Product row ${product.row_number}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="badge">Product #{product.row_number}</span>
        <button onClick={onDelete} className="btn-danger text-xs" aria-label={`Delete product row ${product.row_number}`}>
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block mb-1">Body part</label>
          <select
            value={product.body_part}
            onChange={(e) => onChange({ body_part: e.target.value, key_benefits: [] })}
            className="w-full"
          >
            <option value="">—</option>
            {BODY_PARTS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1">Product category</label>
          <select
            value={product.category}
            onChange={(e) => onChange({ category: e.target.value, sub_category: '' })}
            className="w-full"
          >
            <option value="">—</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1">Sub category</label>
          <select
            value={product.sub_category}
            onChange={(e) => onChange({ sub_category: e.target.value })}
            className="w-full"
            disabled={!product.category}
          >
            <option value="">—</option>
            {subOptions.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="block mb-1">Key benefits (multi-select)</label>
          <div className="flex flex-wrap gap-2">
            {kbOptions.length === 0 && <p className="text-xs text-black/50">Select a body part first.</p>}
            {kbOptions.map((kb) => {
              const active = (product.key_benefits || []).includes(kb)
              return (
                <button
                  key={kb}
                  type="button"
                  onClick={() => toggleKB(kb)}
                  className={`px-3 py-1 rounded text-sm border transition-colors ${
                    active
                      ? 'bg-mustard text-black border-mustard'
                      : 'bg-white text-black border-black/20 hover:border-mustard'
                  }`}
                  aria-pressed={active}
                >
                  {kb}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block mb-1">Size</label>
          <select
            value={product.size}
            onChange={(e) => onChange({ size: e.target.value })}
            className="w-full"
          >
            <option value="">—</option>
            {SIZES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1">Packaging type</label>
          <select
            value={product.packaging_type}
            onChange={(e) => onChange({ packaging_type: e.target.value })}
            className="w-full"
          >
            <option value="">—</option>
            {PACKAGING.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1">Planned MRP (₹)</label>
          <input
            type="number"
            value={product.planned_mrp ?? ''}
            onChange={(e) => onChange({ planned_mrp: e.target.value ? Number(e.target.value) : null })}
            className="w-full"
          />
        </div>

        <div className="md:col-span-3">
          <label className="block mb-1">Packaging notes</label>
          <input
            value={product.packaging_notes}
            onChange={(e) => onChange({ packaging_notes: e.target.value })}
            className="w-full"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block mb-1">Specific ingredient</label>
          <input
            value={product.specific_ingredient}
            onChange={(e) => onChange({ specific_ingredient: e.target.value })}
            className="w-full"
          />
        </div>
        <div>
          <label className="block mb-1">Benchmark product</label>
          <input
            value={product.benchmark_product}
            onChange={(e) => onChange({ benchmark_product: e.target.value })}
            className="w-full"
          />
        </div>

        <div>
          <label className="block mb-1">Color</label>
          <select
            value={product.has_color === null ? '' : product.has_color ? 'yes' : 'no'}
            onChange={(e) => onChange({
              has_color: e.target.value === '' ? null : e.target.value === 'yes',
            })}
            className="w-full"
          >
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block mb-1">Color details</label>
          <input
            value={product.color_details}
            onChange={(e) => onChange({ color_details: e.target.value })}
            className="w-full"
            disabled={product.has_color !== true}
          />
        </div>
        <div>
          <label className="block mb-1">Fragrance</label>
          <select
            value={product.has_fragrance === null ? '' : product.has_fragrance ? 'yes' : 'no'}
            onChange={(e) => onChange({
              has_fragrance: e.target.value === '' ? null : e.target.value === 'yes',
            })}
            className="w-full"
          >
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block mb-1">Fragrance details</label>
          <input
            value={product.fragrance_details}
            onChange={(e) => onChange({ fragrance_details: e.target.value })}
            className="w-full"
            disabled={product.has_fragrance !== true}
          />
        </div>
      </div>
    </div>
  )
}
