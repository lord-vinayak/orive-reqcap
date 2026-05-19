import { useEffect, useRef, useState } from 'react'
import Layout from '@/components/Layout'
import { catalogService } from '@/services'
import type { CatalogItem } from '@/types'

const EMPTY: Partial<CatalogItem> = {
  body_part: '', product_type: '', sub_product_type: '',
  kb_tag1: '', kb_tag2: '', kb_tag3: '',
  specific_ingredients: '', color: '', fragrance: '',
  size: '', packaging_type: '', client_name: '',
  potential_mrp: null,
}

export default function AdminCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<CatalogItem>>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => setItems(await catalogService.search(q ? { q } : {}))
  useEffect(() => { load() }, [q])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      await catalogService.update(editing, form)
    } else {
      await catalogService.create(form)
    }
    setForm(EMPTY); setShowForm(false); setEditing(null)
    load()
  }

  const handleEdit = (item: CatalogItem) => {
    setEditing(item.id); setForm(item); setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this catalog item?')) return
    await catalogService.delete(id)
    load()
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true); setImportMsg('')
    try {
      const res = await catalogService.importXlsx(file)
      setImportMsg(`Imported ${res.created} rows.`)
      load()
    } catch (err: any) {
      setImportMsg(err.response?.data?.detail || 'Import failed')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Product Catalog</h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            onChange={handleImport}
            className="text-sm"
            disabled={importing}
            aria-label="Import catalog xlsx"
          />
          <button onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(!showForm) }} className="btn-primary">
            + Add item
          </button>
        </div>
      </div>

      {importMsg && <p className="text-sm mb-4 text-mustard-700">{importMsg}</p>}

      <input
        placeholder="Search catalog…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full max-w-md mb-4"
      />

      {showForm && (
        <form onSubmit={handleSave} className="card mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input placeholder="Body part" value={form.body_part || ''} onChange={(e) => setForm({ ...form, body_part: e.target.value })} required />
          <input placeholder="Product type" value={form.product_type || ''} onChange={(e) => setForm({ ...form, product_type: e.target.value })} required />
          <input placeholder="Sub product type" value={form.sub_product_type || ''} onChange={(e) => setForm({ ...form, sub_product_type: e.target.value })} />
          <input placeholder="KB tag 1" value={form.kb_tag1 || ''} onChange={(e) => setForm({ ...form, kb_tag1: e.target.value })} />
          <input placeholder="KB tag 2" value={form.kb_tag2 || ''} onChange={(e) => setForm({ ...form, kb_tag2: e.target.value })} />
          <input placeholder="KB tag 3" value={form.kb_tag3 || ''} onChange={(e) => setForm({ ...form, kb_tag3: e.target.value })} />
          <input placeholder="Size" value={form.size || ''} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          <input placeholder="Packaging type" value={form.packaging_type || ''} onChange={(e) => setForm({ ...form, packaging_type: e.target.value })} />
          <input placeholder="Potential MRP" type="number" value={form.potential_mrp ?? ''} onChange={(e) => setForm({ ...form, potential_mrp: e.target.value ? Number(e.target.value) : null })} />
          <input className="md:col-span-3" placeholder="Specific ingredients" value={form.specific_ingredients || ''} onChange={(e) => setForm({ ...form, specific_ingredients: e.target.value })} />
          <div className="md:col-span-3 flex gap-2">
            <button className="btn-primary">{editing ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY) }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="table-clean">
          <thead>
            <tr>
              <th>Body</th>
              <th>Type</th>
              <th>Sub</th>
              <th>Benefits</th>
              <th>Size</th>
              <th>MRP</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.body_part}</td>
                <td>{c.product_type}</td>
                <td>{c.sub_product_type}</td>
                <td className="text-xs">{[c.kb_tag1, c.kb_tag2, c.kb_tag3].filter(Boolean).join(', ')}</td>
                <td>{c.size}</td>
                <td>{c.potential_mrp ?? '—'}</td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(c)} className="btn-secondary text-xs">Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="btn-danger text-xs">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
