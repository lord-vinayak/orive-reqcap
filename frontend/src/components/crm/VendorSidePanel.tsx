import { useEffect, useRef, useState } from 'react'
import { crmApi } from '@/services/crm'
import type { CRMProject, DropdownOption, VendorAssignment, VendorCategory, VendorMini } from '@/types/crm'

// ── Searchable multi-select ──────────────────────────────────────────────────

interface MultiSelectProps {
  options: DropdownOption[]
  selected: VendorMini[]
  onAdd: (opt: DropdownOption) => void
  onRemove: (id: string) => void
  placeholder?: string
}

function MultiSelect({ options, selected, onAdd, onRemove, placeholder }: MultiSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedIds = new Set(selected.map((s) => s.id))
  const filtered = options.filter(
    (o) =>
      !selectedIds.has(o.id) &&
      (query.trim() === '' ||
        o.company_name.toLowerCase().includes(query.toLowerCase()) ||
        (o.vendor_id ?? '').toLowerCase().includes(query.toLowerCase()))
  )

  return (
    <div ref={containerRef} className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-mustard/15 text-black dark:text-white text-xs rounded-full border border-mustard/30"
            >
              {s.company_name}
              <button
                type="button"
                onClick={() => onRemove(s.id)}
                className="text-black/40 dark:text-slate-400 hover:text-black dark:hover:text-white ml-0.5 text-sm leading-none"
                aria-label={`Remove ${s.company_name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
          placeholder={placeholder ?? 'Search by name or ID…'}
          aria-label={placeholder ?? 'Search by name or ID'}
          className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
        />
        {open && (
          <div className="absolute z-50 left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-white dark:bg-slate-800 border border-black/15 dark:border-white/15 rounded shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-black/40 dark:text-slate-500">
                {options.length === 0 ? 'No options available' : 'No results'}
              </p>
            ) : (
              filtered.slice(0, 30).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onMouseDown={() => { onAdd(o); setQuery(''); setOpen(false) }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-mustard/10 dark:hover:bg-mustard/10 flex items-center gap-2"
                >
                  {o.vendor_id && (
                    <span className="text-xs text-black/40 dark:text-slate-400 shrink-0 font-mono w-16">{o.vendor_id}</span>
                  )}
                  <span className="text-black dark:text-white flex-1 truncate">{o.company_name}</span>
                  {o.city && <span className="text-xs text-black/30 dark:text-slate-500 shrink-0">{o.city}</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Add-vendor picker (category → vendor) ────────────────────────────────────

interface AddVendorPickerProps {
  categories: VendorCategory[]
  onAdd: (vendor: DropdownOption, categorySlug: string, categoryName: string) => void
  existingIds: Set<string>
}

function AddVendorPicker({ categories, onAdd, existingIds }: AddVendorPickerProps) {
  const [open, setOpen] = useState(false)
  const [selectedCat, setSelectedCat] = useState<VendorCategory | null>(null)
  const [catOptions, setCatOptions] = useState<DropdownOption[]>([])
  const [loadingCat, setLoadingCat] = useState(false)

  const handleSelectCategory = async (cat: VendorCategory) => {
    setSelectedCat(cat)
    setLoadingCat(true)
    try {
      const res = await crmApi.vendorDropdown(cat.slug)
      setCatOptions(res.data)
    } finally {
      setLoadingCat(false)
    }
  }

  const handleAddVendor = (opt: DropdownOption) => {
    if (!selectedCat) return
    onAdd(opt, selectedCat.slug, selectedCat.name)
    // Stay on step 2 — user can keep adding from the same category
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-mustard hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard rounded"
      >
        + Add Vendor
      </button>
    )
  }

  return (
    <div className="border border-black/10 dark:border-white/10 rounded p-3 space-y-2 bg-slate-50 dark:bg-slate-800">
      {/* Step 1: pick category */}
      {!selectedCat ? (
        <>
          <p className="text-xs text-black/60 dark:text-slate-400 font-medium">Select vendor category</p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className="px-2 py-1 text-xs rounded border border-black/15 dark:border-white/15 bg-white dark:bg-slate-700 text-black dark:text-white hover:border-mustard hover:bg-mustard/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard"
              >
                {cat.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-black/40 dark:text-slate-500 hover:text-black dark:hover:text-white"
          >
            Cancel
          </button>
        </>
      ) : (
        /* Step 2: pick vendor from category */
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-black/60 dark:text-slate-400 font-medium">{selectedCat.name}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setSelectedCat(null); setCatOptions([]) }}
                className="text-xs text-black/40 dark:text-slate-500 hover:text-black dark:hover:text-white"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => { setSelectedCat(null); setCatOptions([]); setOpen(false) }}
                className="text-xs text-mustard hover:underline"
              >
                Done
              </button>
            </div>
          </div>
          {loadingCat ? (
            <p className="text-xs text-black/40 dark:text-slate-500">Loading…</p>
          ) : (
            <MultiSelect
              options={catOptions.filter((o) => !existingIds.has(o.id))}
              selected={[]}
              onAdd={handleAddVendor}
              onRemove={() => {}}
              placeholder={`Search ${selectedCat.name.toLowerCase()}…`}
            />
          )}
        </>
      )}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface Props {
  project: CRMProject
  onClose: () => void
  onSaved: (updated: CRMProject) => void
}

export function VendorSidePanel({ project, onClose, onSaved }: Props) {
  const [manufacturers, setManufacturers] = useState<VendorMini[]>(project.manufacturers ?? [])
  const [vendorAssignments, setVendorAssignments] = useState<VendorAssignment[]>(
    project.vendor_assignments ?? []
  )
  const [mfrOptions, setMfrOptions] = useState<DropdownOption[]>([])
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      crmApi.manufacturerDropdown(),
      crmApi.listVendorCategories(),
    ]).then(([mfr, cats]) => {
      setMfrOptions(mfr.data)
      setCategories(cats.data)
    })
  }, [])

  const addManufacturer = (opt: DropdownOption) => {
    setManufacturers((prev) => {
      if (prev.some((m) => m.id === opt.id)) return prev
      return [...prev, { id: opt.id, vendor_id: opt.vendor_id ?? '', company_name: opt.company_name, city: opt.city ?? '' }]
    })
  }

  const removeManufacturer = (id: string) => {
    setManufacturers((prev) => prev.filter((m) => m.id !== id))
  }

  const addVendor = (opt: DropdownOption, categorySlug: string, categoryName: string) => {
    setVendorAssignments((prev) => {
      if (prev.some((v) => v.id === opt.id)) return prev
      return [...prev, {
        id: opt.id,
        vendor_id: opt.vendor_id ?? '',
        company_name: opt.company_name,
        city: opt.city ?? '',
        category_slug: categorySlug,
        category_name: categoryName,
      }]
    })
  }

  const removeVendor = (id: string) => {
    setVendorAssignments((prev) => prev.filter((v) => v.id !== id))
  }

  // Group vendor assignments by category for display
  const groupedVendors = vendorAssignments.reduce<Record<string, VendorAssignment[]>>((acc, va) => {
    const key = va.category_name
    if (!acc[key]) acc[key] = []
    acc[key].push(va)
    return acc
  }, {})

  const existingVendorIds = new Set(vendorAssignments.map((v) => v.id))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        manufacturers: manufacturers.map((m) => m.id),
        vendor_ids: vendorAssignments.map((v) => v.id),
      }
      const res = await crmApi.updateProject(project.id, payload as any)
      onSaved(res.data)
      onClose()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50" aria-hidden="true" onClick={onClose} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-panel-title"
        className="fixed right-0 top-0 h-full z-50 w-[26rem] bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
          <h2 id="vendor-panel-title" className="font-semibold text-black dark:text-white">
            Vendor Assignments
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-black/50 dark:text-slate-400 hover:text-black dark:hover:text-white text-xl leading-none rounded focus-visible:ring-2 focus-visible:ring-mustard"
            aria-label="Close vendor panel"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Manufacturers — always shown */}
          <div>
            <p className="text-sm font-semibold text-black dark:text-white mb-1.5">Manufacturer</p>
            <MultiSelect
              options={mfrOptions}
              selected={manufacturers}
              onAdd={addManufacturer}
              onRemove={removeManufacturer}
              placeholder="Search manufacturer…"
            />
          </div>

          <hr className="border-black/10 dark:border-white/10" />

          {/* Vendor assignments — dynamic by category */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-black dark:text-white">Vendors</p>

            {/* Existing assignments grouped by category */}
            {Object.entries(groupedVendors).map(([catName, vendors]) => (
              <div key={catName}>
                <p className="text-sm text-black/50 dark:text-slate-400 mb-1">{catName}</p>
                <div className="flex flex-wrap gap-1.5">
                  {vendors.map((v) => (
                    <span
                      key={v.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-mustard/15 text-black dark:text-white text-xs rounded-full border border-mustard/30"
                    >
                      {v.company_name}
                      <button
                        type="button"
                        onClick={() => removeVendor(v.id)}
                        className="text-black/40 dark:text-slate-400 hover:text-black dark:hover:text-white ml-0.5 text-sm leading-none"
                        aria-label={`Remove ${v.company_name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {categories.length > 0 && (
              <AddVendorPicker
                categories={categories}
                onAdd={addVendor}
                existingIds={existingVendorIds}
              />
            )}
          </div>

          {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-black/10 dark:border-white/10 flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </aside>
    </>
  )
}
