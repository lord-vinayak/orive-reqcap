import { useEffect, useRef, useState } from 'react'
import { crmApi } from '@/services/crm'
import type { CRMProject, DropdownOption } from '@/types/crm'

interface Props {
  project: CRMProject
  onClose: () => void
  onSaved: (updated: CRMProject) => void
}

interface Draft {
  manufacturer: string | null
  designer: string | null
  packaging_vendor: string | null
  printer: string | null
  batch_testing_vendor: string | null
  derma_testing_vendor: string | null
}

// ── Searchable select ─────────────────────────────────────────────────────────

interface SearchableSelectProps {
  id: string
  label: string
  options: DropdownOption[]
  value: string | null
  onChange: (id: string | null) => void
  loading?: boolean
}

function SearchableSelect({ id, label, options, value, onChange, loading }: SearchableSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.id === value) ?? null
  const inputId = `${id}-input`

  // When a value is selected and user hasn't started typing, show its name
  const displayText = open ? query : (selected ? selected.company_name : '')

  const filtered = options.filter((o) =>
    o.company_name.toLowerCase().includes(query.toLowerCase()) ||
    o.city.toLowerCase().includes(query.toLowerCase())
  )

  const handleFocus = () => {
    setQuery('')
    setOpen(true)
  }

  const handleSelect = (opt: DropdownOption) => {
    onChange(opt.id)
    setQuery('')
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setQuery('')
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-xs font-medium text-black/60 dark:text-slate-400">
        {label}
      </label>
      <div ref={containerRef} className="relative">
        <div className="flex items-center border border-black/20 dark:border-white/20 rounded bg-white dark:bg-slate-700 focus-within:ring-2 focus-within:ring-mustard">
          <input
            id={inputId}
            type="text"
            value={displayText}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={handleFocus}
            placeholder={loading ? 'Loading…' : 'Search…'}
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm bg-transparent text-black dark:text-white placeholder-black/30 dark:placeholder-slate-500 outline-none rounded"
            autoComplete="off"
          />
          {value && !open && (
            <button
              type="button"
              onClick={handleClear}
              className="px-2 text-black/40 dark:text-slate-500 hover:text-black dark:hover:text-white"
              aria-label={`Clear ${label}`}
            >
              ×
            </button>
          )}
        </div>

        {open && (
          <ul
            role="listbox"
            aria-label={`${label} options`}
            className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded shadow-lg"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-black/40 dark:text-slate-500">
                {loading ? 'Loading…' : 'No results'}
              </li>
            ) : (
              filtered.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={opt.id === value}
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-mustard/10 transition-colors ${
                      opt.id === value ? 'bg-mustard/10 font-medium text-black dark:text-white' : 'text-black dark:text-white'
                    }`}
                  >
                    {opt.company_name}
                    {opt.city && <span className="ml-1 text-xs text-black/40 dark:text-slate-500">({opt.city})</span>}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function VendorSidePanel({ project, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<Draft>({
    manufacturer: project.manufacturer,
    designer: project.designer,
    packaging_vendor: project.packaging_vendor,
    printer: project.printer,
    batch_testing_vendor: project.batch_testing_vendor,
    derma_testing_vendor: project.derma_testing_vendor,
  })

  const [manufacturers, setManufacturers] = useState<DropdownOption[]>([])
  const [designers, setDesigners] = useState<DropdownOption[]>([])
  const [packagingVendors, setPackagingVendors] = useState<DropdownOption[]>([])
  const [printers, setPrinters] = useState<DropdownOption[]>([])
  const [testingVendors, setTestingVendors] = useState<DropdownOption[]>([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(true)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    Promise.all([
      crmApi.manufacturerDropdown(),
      crmApi.vendorDropdown('designer'),
      crmApi.vendorDropdown('packaging'),
      crmApi.vendorDropdown('printing'),
      crmApi.vendorDropdown('testing'),
    ]).then(([mfr, des, pkg, prt, tst]) => {
      setManufacturers(mfr.data)
      setDesigners(des.data)
      setPackagingVendors(pkg.data)
      setPrinters(prt.data)
      setTestingVendors(tst.data)
    }).finally(() => setLoadingDropdowns(false))
  }, [])

  const set = (key: keyof Draft) => (id: string | null) =>
    setDraft((d) => ({ ...d, [key]: id }))

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const res = await crmApi.updateProject(project.id, draft)
      onSaved(res.data)
      onClose()
    } catch {
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-panel-title"
        className="fixed right-0 top-0 h-full z-50 w-96 bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
          <h2 id="vendor-panel-title" className="font-semibold text-black dark:text-white">
            Vendor Assignments
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-black/50 dark:text-slate-400 hover:text-black dark:hover:text-white text-xl leading-none focus-visible:ring-2 focus-visible:ring-mustard rounded"
            aria-label="Close vendor panel"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <SearchableSelect
            id="vp-manufacturer"
            label="Manufacturer"
            options={manufacturers}
            value={draft.manufacturer}
            onChange={set('manufacturer')}
            loading={loadingDropdowns}
          />
          <SearchableSelect
            id="vp-designer"
            label="Designer"
            options={designers}
            value={draft.designer}
            onChange={set('designer')}
            loading={loadingDropdowns}
          />
          <SearchableSelect
            id="vp-packaging"
            label="Packaging Vendor"
            options={packagingVendors}
            value={draft.packaging_vendor}
            onChange={set('packaging_vendor')}
            loading={loadingDropdowns}
          />
          <SearchableSelect
            id="vp-printer"
            label="Printer"
            options={printers}
            value={draft.printer}
            onChange={set('printer')}
            loading={loadingDropdowns}
          />
          <SearchableSelect
            id="vp-batch-testing"
            label="Batch Testing"
            options={testingVendors}
            value={draft.batch_testing_vendor}
            onChange={set('batch_testing_vendor')}
            loading={loadingDropdowns}
          />
          <SearchableSelect
            id="vp-derma-testing"
            label="Derma Testing"
            options={testingVendors}
            value={draft.derma_testing_vendor}
            onChange={set('derma_testing_vendor')}
            loading={loadingDropdowns}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-black/10 dark:border-white/10 space-y-2">
          {saveError && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
          )}
          <div className="flex gap-3">
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
              disabled={saving}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
