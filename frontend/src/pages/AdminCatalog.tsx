import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Layout from '@/components/Layout'
import { catalogService } from '@/services'
import type { CatalogItem } from '@/types'

// ---------------------------------------------------------------------------
// Column definitions — every field from the Excel template
// ---------------------------------------------------------------------------
const COLUMNS: { key: keyof CatalogItem; label: string; numeric?: boolean; width: string }[] = [
  { key: 'uploaded_at',               label: 'Upload Date',                width: 'min-w-[110px]' },
  { key: 'body_part',                 label: 'Body Part',                  width: 'min-w-[100px]' },
  { key: 'product_type',              label: 'Product Type',               width: 'min-w-[120px]' },
  { key: 'sub_product_type',          label: 'Sub Product Type',           width: 'min-w-[140px]' },
  { key: 'kb_tag1',                   label: 'Key Benefit 1',              width: 'min-w-[130px]' },
  { key: 'kb_tag2',                   label: 'Key Benefit 2',              width: 'min-w-[130px]' },
  { key: 'kb_tag3',                   label: 'Key Benefit 3',              width: 'min-w-[130px]' },
  { key: 'specific_ingredients',      label: 'Specific Ingredients',       width: 'min-w-[200px]' },
  { key: 'color',                     label: 'Color',                      width: 'min-w-[80px]'  },
  { key: 'fragrance',                 label: 'Fragrance',                  width: 'min-w-[100px]' },
  { key: 'size',                      label: 'Size',                       width: 'min-w-[70px]'  },
  { key: 'packaging_type',            label: 'Packaging Type',             width: 'min-w-[120px]' },
  { key: 'rate_category',             label: 'Rate Category',              width: 'min-w-[120px]' },
  { key: 'per_kg_rate',               label: 'Per KG Rate',       numeric: true, width: 'min-w-[110px]' },
  { key: 'manufacturing_cost',        label: 'Manufacturing Cost',numeric: true, width: 'min-w-[150px]' },
  { key: 'rate_per_unit',             label: 'Rate Per Unit',     numeric: true, width: 'min-w-[120px]' },
  { key: 'tentative_packaging_cost',  label: 'Tentative Packaging Cost', numeric: true, width: 'min-w-[190px]' },
  { key: 'label_cost',                label: 'Label Cost',        numeric: true, width: 'min-w-[110px]' },
  { key: 'tentative_monocarton_cost', label: 'Tentative Monocarton Cost', numeric: true, width: 'min-w-[200px]' },
  { key: 'total_cost',                label: 'Total Cost',        numeric: true, width: 'min-w-[110px]' },
  { key: 'potential_mrp',             label: 'Potential MRP',     numeric: true, width: 'min-w-[120px]' },
]

const RATE_CATEGORIES = ['Basic', 'Premium', 'Luxury']

type Filters = {
  body_part: string
  product_type: string
  sub_product_type: string
  key_benefits: string[]
  rate_category: string
  q: string
}

const EMPTY_FILTERS: Filters = {
  body_part: '', product_type: '', sub_product_type: '',
  key_benefits: [], rate_category: '', q: '',
}

function fmt(val: unknown, numeric?: boolean) {
  if (!numeric) return (val as string | null) ?? '—'
  if (val === null || val === undefined) return '—'
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ---------------------------------------------------------------------------
export default function AdminCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

  // Facets for dropdown options
  const [facets, setFacets] = useState<{
    body_parts: string[]; product_types: string[]; sub_product_types: string[]; key_benefits: string[]; rate_categories: string[]
  }>({ body_parts: [], product_types: [], sub_product_types: [], key_benefits: [], rate_categories: [] })

  // Key benefits multi-select portal state
  const [kbOpen, setKbOpen]           = useState(false)
  const [kbDropStyle, setKbDropStyle] = useState<React.CSSProperties>({})
  const kbBtnRef  = useRef<HTMLButtonElement>(null)
  const kbDropRef = useRef<HTMLDivElement>(null)

  // Import state
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Template download state
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)

  // ---- Load catalog -------------------------------------------------------
  const load = async () => {
    setLoading(true)
    try {
      const params: Record<string, string | string[]> = {}
      if (filters.body_part)         params.body_part        = filters.body_part
      if (filters.product_type)      params.product_type     = filters.product_type
      if (filters.sub_product_type)  params.sub_product_type = filters.sub_product_type
      if (filters.key_benefits.length) params.key_benefit    = filters.key_benefits
      if (filters.rate_category)     params.rate_category    = filters.rate_category
      if (filters.q)                 params.q                = filters.q
      setItems(await catalogService.search(params))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filters])

  // ---- Load facets --------------------------------------------------------
  useEffect(() => {
    catalogService.facets().then(setFacets)
  }, [])

  // ---- KB dropdown outside-click or Escape ---------------------------------
  useEffect(() => {
    if (!kbOpen) return
    const handleMouse = (e: MouseEvent) => {
      const t = e.target as Node
      if (kbBtnRef.current?.contains(t) || kbDropRef.current?.contains(t)) return
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
    if (kbBtnRef.current) {
      const r = kbBtnRef.current.getBoundingClientRect()
      setKbDropStyle({ position: 'fixed', top: r.bottom + 4, left: r.left, minWidth: r.width, zIndex: 9999 })
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

  // ---- Append import ------------------------------------------------------
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportMsg(null)
    try {
      const res = await catalogService.importXlsx(file)
      setImportMsg({
        text: `Appended ${res.created} new row${res.created === 1 ? '' : 's'} from "${file.name}" to the catalog.`,
        ok: true,
      })
      load()
    } catch (err: any) {
      setImportMsg({ text: err.response?.data?.detail || 'Import failed.', ok: false })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ---- Template download --------------------------------------------------
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      const blob = await catalogService.downloadTemplate()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'catalog_template.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // silent — rare failure
    } finally {
      setDownloadingTemplate(false)
    }
  }

  // ---- Delete single item -------------------------------------------------
  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this catalog item?')) return
    await catalogService.delete(id)
    load()
  }

  const activeFilterCount = [
    filters.body_part, filters.product_type, filters.sub_product_type,
    filters.rate_category, filters.q,
  ].filter(Boolean).length + filters.key_benefits.length

  return (
    <Layout title="Product Catalog">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Product Catalog</h1>
          <p className="text-xs text-black/60 mt-0.5">{items.length} items shown</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Download template button */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            className="btn-secondary text-sm"
            aria-label="Download Excel template with dropdown validation"
          >
            {downloadingTemplate ? 'Downloading…' : '⬇ Download template (Excel)'}
          </button>

          {/* Append-import button */}
          <label
            className={`btn-primary text-sm cursor-pointer flex items-center gap-2 ${importing ? 'opacity-60 pointer-events-none' : ''}`}
            title="Upload an Excel file to append rows to the catalog (existing rows are kept)"
          >
            {importing ? 'Importing…' : '⬆ Append catalog (Excel)'}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              onChange={handleImport}
              className="hidden"
              disabled={importing}
              aria-label="Append catalog rows from Excel file"
            />
          </label>
        </div>
      </div>

      {/* Import result message */}
      {importMsg && (
        <div
          className={`mb-4 p-3 rounded text-sm border ${
            importMsg.ok
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
          role="status"
          aria-live="polite"
        >
          {importMsg.text}
        </div>
      )}

      {/* ---- Filter bar ---- */}
      <div className="card mb-4 flex flex-wrap gap-3 items-end p-4 dark:bg-slate-800">
        {/* Body Part */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-black/60">Body Part</label>
          <select
            value={filters.body_part}
            onChange={(e) => setFilters((f) => ({ ...f, body_part: e.target.value }))}
            className="text-sm min-w-[120px]"
          >
            <option value="">All</option>
            {(facets.body_parts.length ? facets.body_parts : ['Face', 'Body', 'Hair', 'Lip', 'Eye']).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Product Type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-black/60">Product Type</label>
          <select
            value={filters.product_type}
            onChange={(e) => setFilters((f) => ({ ...f, product_type: e.target.value }))}
            className="text-sm min-w-[130px]"
          >
            <option value="">All</option>
            {facets.product_types.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>

        {/* Sub Product Type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-black/60">Sub Product Type</label>
          <select
            value={filters.sub_product_type}
            onChange={(e) => setFilters((f) => ({ ...f, sub_product_type: e.target.value }))}
            className="text-sm min-w-[150px]"
          >
            <option value="">All</option>
            {facets.sub_product_types.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>

        {/* Key Benefits multi-select */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-black/60">Key Benefits</label>
          <button
            ref={kbBtnRef}
            type="button"
            onClick={openKbDrop}
            aria-haspopup="true"
            aria-expanded={kbOpen}
            className="text-sm text-left px-2 py-1 border border-black/15 rounded bg-white hover:border-mustard min-w-[160px] truncate"
          >
            {filters.key_benefits.length === 0 ? 'All' : filters.key_benefits.join(', ')}
          </button>
          {kbOpen && createPortal(
            <div
              ref={kbDropRef}
              role="group"
              aria-label="Key benefits options"
              style={kbDropStyle}
              className="max-h-56 overflow-auto bg-white border border-black/15 rounded shadow-lg p-2"
            >
              {(facets.key_benefits.length ? facets.key_benefits : []).length === 0
                ? <p className="text-xs text-black/60 px-2 py-1">No options yet.</p>
                : facets.key_benefits.map((kb) => (
                    <label key={kb} className="flex items-center gap-2 px-2 py-1 hover:bg-mustard-50 rounded cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        className="accent-mustard"
                        checked={filters.key_benefits.includes(kb)}
                        onChange={() => toggleKb(kb)}
                      />
                      <span>{kb}</span>
                    </label>
                  ))
              }
            </div>,
            document.body,
          )}
        </div>

        {/* Rate Category */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-black/60">Rate Category</label>
          <select
            value={filters.rate_category}
            onChange={(e) => setFilters((f) => ({ ...f, rate_category: e.target.value }))}
            className="text-sm min-w-[130px]"
          >
            <option value="">All</option>
            {(facets.rate_categories.length ? facets.rate_categories : RATE_CATEGORIES).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Free text search */}
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-black/60">Search</label>
          <input
            placeholder="Search by ingredient, client, type…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            className="text-sm"
          />
        </div>

        {/* Reset */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="btn-secondary text-xs self-end"
          >
            Clear filters ({activeFilterCount})
          </button>
        )}
      </div>

      {/* ---- Table ---- */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="text-sm text-black/60 p-6">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-black/60 p-6">
            {activeFilterCount > 0
              ? 'No catalog items match the current filters.'
              : 'No catalog items yet. Upload an Excel file to get started.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-mustard-50 text-black/80 text-xs sticky top-0 z-10">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={`px-3 py-2 text-left font-medium border-b border-black/10 whitespace-nowrap ${col.width} ${col.numeric ? 'text-right' : ''}`}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-2 border-b border-black/10 w-20 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={idx % 2 === 1 ? 'bg-black/[0.015] dark:bg-white/[0.02] hover:bg-mustard-50/30 dark:hover:bg-slate-700/30' : 'hover:bg-mustard-50/30 dark:hover:bg-slate-700/30'}
                  >
                    {COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2 border-b border-black/5 align-top ${col.numeric ? 'text-right tabular-nums' : ''} ${col.key === 'specific_ingredients' ? 'max-w-[200px] truncate' : 'whitespace-nowrap'}`}
                        title={col.key === 'specific_ingredients' ? String(item[col.key] ?? '') : undefined}
                      >
                        {fmt(item[col.key], col.numeric)}
                      </td>
                    ))}
                    <td className="px-3 py-2 border-b border-black/5 text-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="btn-danger text-xs"
                        aria-label={`Delete ${item.body_part} ${item.product_type}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
