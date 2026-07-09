import { useEffect, useId, useRef, useState } from 'react'
import Layout from '@/components/Layout'
import { useAuthStore } from '@/store/authStore'
import { ingredientRecordService } from '@/services'
import type { IngredientUploadResult } from '@/services'
import type { IngredientRecord } from '@/types'

const PAGE_SIZE = 50

type DraftRow = Partial<IngredientRecord>

const BLANK_DRAFT: DraftRow = {
  date: null, category: '', client_name: '', vendor_name: '', product_name: '',
  ingredient_use: '', quantity_sent: null, used_in_batch: null, comment: '',
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

function computeRemained(draft: DraftRow) {
  const sent = draft.quantity_sent ? Number(draft.quantity_sent) : null
  if (sent === null) return null
  const used = draft.used_in_batch ? Number(draft.used_in_batch) : 0
  return sent - used
}

// ── Row editor — used for both the "add new" row and inline edit ────────────

function RowEditor({
  draft, setDraft, onSave, onCancel, saving,
}: {
  draft: DraftRow
  setDraft: (d: DraftRow) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const set = (field: keyof IngredientRecord) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft({ ...draft, [field]: e.target.value })
  }
  const inputCls = 'w-full text-sm border border-black/20 dark:border-white/20 rounded px-2 py-1 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard'
  const remained = computeRemained(draft)

  return (
    <tr className="bg-mustard/5">
      <td className="px-2 py-2 text-black/40 dark:text-slate-500">—</td>
      <td className="px-2 py-2"><input aria-label="Date" type="date" className={inputCls} value={draft.date ?? ''} onChange={set('date')} /></td>
      <td className="px-2 py-2"><input aria-label="Category" className={inputCls} value={draft.category ?? ''} onChange={set('category')} /></td>
      <td className="px-2 py-2"><input aria-label="Client name" className={inputCls} value={draft.client_name ?? ''} onChange={set('client_name')} /></td>
      <td className="px-2 py-2"><input aria-label="Vendor name" className={inputCls} value={draft.vendor_name ?? ''} onChange={set('vendor_name')} /></td>
      <td className="px-2 py-2"><input aria-label="Product name" className={inputCls} value={draft.product_name ?? ''} onChange={set('product_name')} /></td>
      <td className="px-2 py-2"><input aria-label="Ingredient use / purpose" className={inputCls} value={draft.ingredient_use ?? ''} onChange={set('ingredient_use')} /></td>
      <td className="px-2 py-2"><input aria-label="Quantity sent in grams" type="number" min={0} step="0.01" className={inputCls} value={draft.quantity_sent ?? ''} onChange={set('quantity_sent')} /></td>
      <td className="px-2 py-2"><input aria-label="Used in batch" type="number" min={0} step="0.01" className={inputCls} value={draft.used_in_batch ?? ''} onChange={set('used_in_batch')} /></td>
      <td className="px-2 py-2 text-black/60 dark:text-slate-400 bg-amber-50 dark:bg-amber-950/30 tabular-nums">{remained ?? '—'}</td>
      <td className="px-2 py-2"><input aria-label="Comment" className={inputCls} value={draft.comment ?? ''} onChange={set('comment')} /></td>
      <td className="px-2 py-2 whitespace-nowrap">
        <button type="button" onClick={onSave} disabled={saving} className="text-xs font-semibold text-mustard-700 hover:underline disabled:opacity-50 mr-2">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="text-xs text-black/50 dark:text-slate-400 hover:underline">
          Cancel
        </button>
      </td>
    </tr>
  )
}

// ── Import section ───────────────────────────────────────────────────────────

function ImportSection({ onImported }: { onImported: () => void }) {
  const fileInputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<IngredientUploadResult | null>(null)
  const [error, setError] = useState('')

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setResult(null)
    setError('')
    try {
      const res = await ingredientRecordService.bulkUpload(file)
      setResult(res)
      if (inputRef.current) inputRef.current.value = ''
      setFile(null)
      onImported()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <details className="border border-black/10 dark:border-white/10 rounded-lg">
      <summary className="cursor-pointer px-4 py-3 font-medium text-sm text-black dark:text-white select-none">
        Import old ingredient data from Excel
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-3">
        <p className="text-sm text-black/60 dark:text-slate-300">
          Required columns: <code className="bg-black/5 dark:bg-white/10 px-1 rounded">client_name</code>,{' '}
          <code className="bg-black/5 dark:bg-white/10 px-1 rounded">vendor_name</code>,{' '}
          <code className="bg-black/5 dark:bg-white/10 px-1 rounded">product_name</code>. All other columns are optional.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label htmlFor={fileInputId} className="block text-sm font-medium text-black dark:text-white mb-1">Select Excel file</label>
            <input
              id={fileInputId}
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setError('') }}
              className="block w-full text-sm text-black dark:text-white file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-mustard file:text-black hover:file:bg-mustard/80 cursor-pointer"
            />
          </div>
          <button onClick={handleUpload} disabled={!file || uploading} className="btn-primary text-sm" aria-busy={uploading}>
            {uploading ? 'Importing…' : 'Import'}
          </button>
          <button onClick={() => ingredientRecordService.downloadTemplate()} className="btn-secondary text-sm">
            ↓ Download Template
          </button>
        </div>

        {error && <div role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</div>}

        {result && (
          <div className="text-sm space-y-1" aria-live="polite">
            <p className="text-green-700 dark:text-green-400">{result.created.length} row(s) imported.</p>
            {result.created.some((r) => r.warning) && (
              <div>
                <p className="text-amber-600 dark:text-amber-400 font-medium">Some dates couldn't be read:</p>
                <ul className="list-disc list-inside text-black/60 dark:text-slate-300">
                  {result.created.filter((r) => r.warning).map((r) => (
                    <li key={r.row}>Row {r.row} ({r.client_name}): {r.warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.skipped.length > 0 && (
              <div>
                <p className="text-amber-600 dark:text-amber-400 font-medium">{result.skipped.length} row(s) skipped:</p>
                <ul className="list-disc list-inside text-black/60 dark:text-slate-300">
                  {result.skipped.map((r) => (
                    <li key={r.row}>Row {r.row} ({r.client_name}): {r.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IngredientInventory() {
  const searchId = useId()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const [rows, setRows] = useState<IngredientRecord[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const [adding, setAdding] = useState(false)
  const [addDraft, setAddDraft] = useState<DraftRow>(BLANK_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<DraftRow>({})
  const [saving, setSaving] = useState(false)

  const fetchRows = (q = search, p = page) => {
    setLoading(true)
    ingredientRecordService.list({ ...(q ? { q } : {}), page: p, page_size: PAGE_SIZE })
      .then((data) => {
        if (Array.isArray(data)) {
          setRows(data); setCount(data.length)
        } else {
          setRows(data.results); setCount(data.count)
        }
      })
      .catch(() => setError('Failed to load ingredient records.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRows(search, page) }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchRows(search.trim(), 1)
  }

  const handleAddSave = async () => {
    if (!addDraft.client_name?.trim() || !addDraft.vendor_name?.trim() || !addDraft.product_name?.trim()) {
      setError('Client name, vendor name, and product name are required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await ingredientRecordService.create(addDraft)
      setAdding(false)
      setAddDraft(BLANK_DRAFT)
      fetchRows()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Could not save row.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (row: IngredientRecord) => {
    setEditingId(row.id)
    setEditDraft({ ...row })
  }

  const handleEditSave = async () => {
    if (!editingId) return
    setSaving(true)
    setError('')
    try {
      const updated = await ingredientRecordService.update(editingId, editDraft)
      setRows((prev) => prev.map((r) => (r.id === editingId ? updated : r)))
      setEditingId(null)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Could not save row.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this ingredient record? This cannot be undone.')) return
    try {
      await ingredientRecordService.remove(id)
      setRows((prev) => prev.filter((r) => r.id !== id))
      setCount((c) => c - 1)
    } catch {
      setError('Could not delete row.')
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const headers = ['Count', 'Date', 'Category', 'Client Name', 'Vendor Name', 'Product Name', 'Ingredient Use / Purpose', 'Quantity Sent (gm)', 'Used in Batch', 'Quantity Remained', 'Comment', 'Actions']

  return (
    <Layout title="Ingredient Inventory">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-black dark:text-white">Ingredient Inventory</h1>
          <button
            type="button"
            onClick={() => { setAdding(true); setAddDraft(BLANK_DRAFT) }}
            className="btn-primary text-sm"
            disabled={adding}
          >
            + Add Ingredient
          </button>
        </div>

        <ImportSection onImported={() => fetchRows()} />

        <form onSubmit={handleSearch} role="search" aria-label="Search ingredient records">
          <div className="flex gap-2">
            <label htmlFor={searchId} className="sr-only">Search by client, vendor, product, or category</label>
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client, vendor, product, or category…"
              className="flex-1 border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
            />
            <button type="submit" className="btn-primary text-sm px-4">Search</button>
            {search && (
              <button type="button" className="btn-secondary text-sm px-4" onClick={() => { setSearch(''); fetchRows('', 1); setPage(1) }}>
                Clear
              </button>
            )}
          </div>
        </form>

        {error && <div role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</div>}

        {loading ? (
          <div role="status" aria-live="polite" className="text-sm text-black/60 dark:text-slate-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
            <table className="w-full text-sm" aria-label="Ingredient inventory">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 text-left">
                  {headers.map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-semibold text-black dark:text-white whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {adding && (
                  <RowEditor draft={addDraft} setDraft={setAddDraft} onSave={handleAddSave} onCancel={() => setAdding(false)} saving={saving} />
                )}
                {rows.length === 0 && !adding ? (
                  <tr><td colSpan={headers.length} className="px-3 py-6 text-center text-black/50 dark:text-slate-400">No ingredient records found.</td></tr>
                ) : (
                  rows.map((r, i) =>
                    editingId === r.id ? (
                      <RowEditor key={r.id} draft={editDraft} setDraft={setEditDraft} onSave={handleEditSave} onCancel={() => setEditingId(null)} saving={saving} />
                    ) : (
                      <tr key={r.id} className="hover:bg-black/2 dark:hover:bg-white/2">
                        <td className="px-3 py-2 text-black/50 dark:text-slate-400 tabular-nums">{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-3 py-2 text-black/70 dark:text-slate-300 whitespace-nowrap">{fmtDate(r.date)}</td>
                        <td className="px-3 py-2 text-black/70 dark:text-slate-300">{r.category || '—'}</td>
                        <td className="px-3 py-2 font-medium text-black dark:text-white">{r.client_name}</td>
                        <td className="px-3 py-2 text-black/70 dark:text-slate-300">{r.vendor_name}</td>
                        <td className="px-3 py-2 text-black/70 dark:text-slate-300">{r.product_name}</td>
                        <td className="px-3 py-2 text-black/70 dark:text-slate-300">{r.ingredient_use || '—'}</td>
                        <td className="px-3 py-2 text-black/70 dark:text-slate-300 tabular-nums">{r.quantity_sent ?? '—'}</td>
                        <td className="px-3 py-2 text-black/70 dark:text-slate-300 tabular-nums">{r.used_in_batch ?? '—'}</td>
                        <td className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 tabular-nums">{r.quantity_remained ?? '—'}</td>
                        <td className="px-3 py-2 text-black/70 dark:text-slate-300">{r.comment || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button type="button" onClick={() => startEdit(r)} className="text-xs font-semibold text-mustard-700 hover:underline mr-3">
                            Edit
                          </button>
                          {isAdmin && (
                            <button type="button" onClick={() => handleDelete(r.id)} className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline">
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {count > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-black/60 dark:text-slate-400" role="status" aria-live="polite">
              Page {page} of {totalPages} · {count} ingredient records
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded border border-black/15 dark:border-white/15 disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-mustard">
                ← Prev
              </button>
              <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages || loading}
                className="px-3 py-1.5 rounded border border-black/15 dark:border-white/15 disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-mustard">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
