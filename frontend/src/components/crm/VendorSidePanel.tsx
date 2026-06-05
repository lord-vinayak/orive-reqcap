import { useEffect, useRef, useState } from 'react'
import { crmApi } from '@/services/crm'
import type { CRMProject, DropdownOption, VendorMini } from '@/types/crm'

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
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-mustard/15 text-black dark:text-white text-xs rounded-full border border-mustard/30"
            >
              {s.vendor_id && <span className="font-mono text-black/40 dark:text-slate-400">[{s.vendor_id}]</span>}
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

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
          placeholder={placeholder ?? 'Search by name or ID…'}
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

// ── Panel ─────────────────────────────────────────────────────────────────────

interface Props {
  project: CRMProject
  onClose: () => void
  onSaved: (updated: CRMProject) => void
}

interface VendorDraft {
  manufacturers: VendorMini[]
  designers: VendorMini[]
  packaging_vendors: VendorMini[]
  printers: VendorMini[]
  batch_testing_vendors: VendorMini[]
  derma_testing_vendors: VendorMini[]
}

interface AllOptions {
  manufacturers: DropdownOption[]
  designers: DropdownOption[]
  packaging: DropdownOption[]
  printing: DropdownOption[]
  testing: DropdownOption[]
}

const ROLE_ROWS: Array<{
  key: keyof VendorDraft
  label: string
  optionsKey: keyof AllOptions
}> = [
  { key: 'manufacturers', label: 'Manufacturer', optionsKey: 'manufacturers' },
  { key: 'designers', label: 'Designer', optionsKey: 'designers' },
  { key: 'packaging_vendors', label: 'Packaging Vendor', optionsKey: 'packaging' },
  { key: 'printers', label: 'Printer', optionsKey: 'printing' },
  { key: 'batch_testing_vendors', label: 'Batch Testing', optionsKey: 'testing' },
  { key: 'derma_testing_vendors', label: 'Derma Testing', optionsKey: 'testing' },
]

export function VendorSidePanel({ project, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<VendorDraft>({
    manufacturers: project.manufacturers ?? [],
    designers: project.designers ?? [],
    packaging_vendors: project.packaging_vendors ?? [],
    printers: project.printers ?? [],
    batch_testing_vendors: project.batch_testing_vendors ?? [],
    derma_testing_vendors: project.derma_testing_vendors ?? [],
  })
  const [options, setOptions] = useState<AllOptions>({
    manufacturers: [],
    designers: [],
    packaging: [],
    printing: [],
    testing: [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      crmApi.manufacturerDropdown(),
      crmApi.vendorDropdown('designer'),
      crmApi.vendorDropdown('packaging'),
      crmApi.vendorDropdown('printing'),
      crmApi.vendorDropdown('testing'),
    ]).then(([mfr, des, pkg, prt, tst]) => {
      setOptions({
        manufacturers: mfr.data,
        designers: des.data,
        packaging: pkg.data,
        printing: prt.data,
        testing: tst.data,
      })
    })
  }, [])

  const addToRole = (key: keyof VendorDraft, opt: DropdownOption) => {
    setDraft((d) => {
      const already = d[key].some((s) => s.id === opt.id)
      if (already) return d
      return {
        ...d,
        [key]: [...d[key], { id: opt.id, vendor_id: opt.vendor_id ?? '', company_name: opt.company_name, city: opt.city ?? '' }],
      }
    })
  }

  const removeFromRole = (key: keyof VendorDraft, id: string) => {
    setDraft((d) => ({ ...d, [key]: d[key].filter((s) => s.id !== id) }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        manufacturers: draft.manufacturers.map((s) => s.id),
        designers: draft.designers.map((s) => s.id),
        packaging_vendors: draft.packaging_vendors.map((s) => s.id),
        printers: draft.printers.map((s) => s.id),
        batch_testing_vendors: draft.batch_testing_vendors.map((s) => s.id),
        derma_testing_vendors: draft.derma_testing_vendors.map((s) => s.id),
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
      <div className="fixed inset-0 z-40 backdrop-blur-md bg-slate-900/40 dark:bg-slate-950/60" aria-hidden="true" onClick={onClose} />

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
          {ROLE_ROWS.map((row) => (
            <div key={row.key}>
              <p className="text-xs font-medium text-black/60 dark:text-slate-400 mb-1.5">{row.label}</p>
              <MultiSelect
                options={options[row.optionsKey]}
                selected={draft[row.key]}
                onAdd={(opt) => addToRole(row.key, opt)}
                onRemove={(id) => removeFromRole(row.key, id)}
                placeholder={`Search ${row.label.toLowerCase()}…`}
              />
            </div>
          ))}

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
