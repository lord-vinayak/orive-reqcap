import React, { useEffect, useRef, useState, useId } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { crmApi } from '@/services/crm'
import { clientService } from '@/services'
import type { Manufacturer, Vendor, InternalTeamMember, VendorType, ProjectPayment, VendorCategory, CRMProjectList, PaymentDirection } from '@/types/crm'
import type { Client } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { Modal } from '@/components/crm/Modal'
import { SUB_TYPES_BY_DIRECTION, DEFAULT_SUB_TYPE, DIRECTION_BADGE, DIRECTION_AMOUNT } from '@/components/crm/PaymentSidePanel'

const INTERNAL_TABS = ['formulation', 'sales', 'ops', 'admin'] as const

export default function CRMMasterData() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  // Load vendor categories from API
  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>([])
  const [catsLoading, setCatsLoading] = useState(true)

  const loadCategories = () => {
    setCatsLoading(true)
    crmApi.listVendorCategories()
      .then((r) => setVendorCategories(r.data))
      .finally(() => setCatsLoading(false))
  }

  useEffect(() => { loadCategories() }, [])

  // Build the full tab list dynamically
  const STATIC_FRONT = [{ id: 'manufacturers', label: 'Manufacturers' }]
  const STATIC_BACK = [
    { id: 'formulation', label: 'Formulation Team' },
    { id: 'sales', label: 'Sales Team' },
    { id: 'ops', label: 'Ops Team' },
    { id: 'admin', label: 'Admin' },
    ...(isAdmin ? [{ id: 'manage-categories', label: '⚙ Categories' }] : []),
  ]
  const vendorTabs = vendorCategories.map((c) => ({ id: c.slug, label: c.name }))
  const allTabs = [...STATIC_FRONT, ...vendorTabs, ...STATIC_BACK]
  const tabValues = allTabs.map((t) => t.id)

  const [activeTab, setActiveTab] = useState('manufacturers')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleTabKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let next = -1
    if (e.key === 'ArrowRight') { e.preventDefault(); next = (currentIndex + 1) % tabValues.length }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); next = (currentIndex - 1 + tabValues.length) % tabValues.length }
    else if (e.key === 'Home') { e.preventDefault(); next = 0 }
    else if (e.key === 'End') { e.preventDefault(); next = tabValues.length - 1 }
    if (next >= 0) { setActiveTab(tabValues[next]); tabRefs.current[next]?.focus() }
  }

  const vendorSlugs = vendorCategories.map((c) => c.slug)

  return (
    <Layout title="Master Data">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-black dark:text-white">Master Data</h1>

        {catsLoading ? (
          <LoadingState />
        ) : (
          <>
            <div role="tablist" aria-label="Master data categories" className="flex flex-wrap gap-1 border-b border-black/10 dark:border-white/10">
              {allTabs.map((tab, index) => (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[index] = el }}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors focus-visible:ring-2 focus-visible:ring-mustard -mb-px ${
                    activeTab === tab.id
                      ? 'border-mustard text-mustard'
                      : 'border-transparent text-black/60 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-black/20'
                  }`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  id={`tab-${tab.id}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} tabIndex={0}>
              {activeTab === 'manufacturers' && <ManufacturerTab isAdmin={isAdmin} />}
              {vendorSlugs.includes(activeTab) && (
                <VendorTab vendorType={activeTab} isAdmin={isAdmin} />
              )}
              {INTERNAL_TABS.includes(activeTab as typeof INTERNAL_TABS[number]) && (
                <InternalTeamTab team={activeTab as 'formulation' | 'sales' | 'ops'} isAdmin={isAdmin} />
              )}
              {activeTab === 'manage-categories' && isAdmin && (
                <ManageCategoriesPanel
                  categories={vendorCategories}
                  onChanged={loadCategories}
                />
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

// ── Manage Categories Panel ───────────────────────────────────────────────────

function ManageCategoriesPanel({ categories, onChanged }: {
  categories: VendorCategory[]
  onChanged: () => void
}) {
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    setError('')
    try {
      await crmApi.createVendorCategory({ name: newName.trim() })
      setNewName('')
      onChanged()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to create category.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat: VendorCategory) => {
    if (!window.confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return
    setDeletingId(cat.id)
    setError('')
    try {
      await crmApi.deleteVendorCategory(cat.id)
      onChanged()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to delete category.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-base font-semibold text-black dark:text-white mb-3">Vendor Categories</h2>
        <div className="rounded border border-black/10 dark:border-white/10 overflow-hidden">
          <table className="w-full text-sm" aria-label="Vendor categories list">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 text-left">
                <th scope="col" className="px-4 py-2 font-semibold text-black dark:text-white">Name</th>
                <th scope="col" className="px-4 py-2 font-semibold text-black dark:text-white">Slug</th>
                <th scope="col" className="px-4 py-2 font-semibold text-black dark:text-white">Prefix</th>
                <th scope="col" className="px-4 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-black/2 dark:hover:bg-white/2">
                  <td className="px-4 py-2 text-black dark:text-white">{cat.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-black/60 dark:text-slate-400">{cat.slug}</td>
                  <td className="px-4 py-2 font-mono text-xs text-black/60 dark:text-slate-400">{cat.prefix}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDelete(cat)}
                      disabled={deletingId === cat.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-red-400 rounded"
                      aria-label={`Delete category ${cat.name}`}
                    >
                      {deletingId === cat.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 items-end">
        <div className="flex-1">
          <label htmlFor="new-cat-name" className="block text-xs text-black/60 dark:text-slate-400 mb-1">
            New category name
          </label>
          <input
            id="new-cat-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Distributor"
            className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-mustard"
            aria-required="true"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="btn-primary text-sm disabled:opacity-40"
          aria-busy={saving}
        >
          {saving ? 'Adding…' : '+ Add'}
        </button>
      </form>

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <p className="text-xs text-black/50 dark:text-slate-500">
        Slug and prefix are auto-derived from the name. Deletion is blocked if any vendors exist in that category.
      </p>
    </div>
  )
}

// ── Manufacturer Tab ──────────────────────────────────────────────────────────

const EMPTY_MANUFACTURER: Partial<Manufacturer> = {
  company_name: '', poc_name: '', phone_no: '', email: '', city: '', state: '', address: '',
  us_fda: false, cosmetic_fda: false, ayush: false, iso: false,
  gst_certified: false, gmp: false, stability_chamber: false,
  bank_account_no: '', bank_ifsc: '', bank_name: '', pan_no: '', gst_no: '', notes: '',
}

const CERT_FIELDS: Array<{ key: keyof Manufacturer; label: string }> = [
  { key: 'us_fda', label: 'US FDA' },
  { key: 'cosmetic_fda', label: 'Cosmetic FDA' },
  { key: 'ayush', label: 'Ayush' },
  { key: 'iso', label: 'ISO' },
  { key: 'gst_certified', label: 'GST' },
  { key: 'gmp', label: 'GMP' },
  { key: 'stability_chamber', label: 'Stability Chamber' },
]

function ManufacturerTab({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<Manufacturer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Manufacturer | null>(null)
  const [viewing, setViewing] = useState<Manufacturer | null>(null)
  const [txnEntity, setTxnEntity] = useState<{ id: string; vendor_id: string; company_name: string; kind: 'manufacturer' | 'vendor' } | null>(null)

  const load = () => {
    setLoading(true)
    crmApi.listManufacturers().then((r) => setItems(r.data.results)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSaved = () => { setShowModal(false); setEditing(null); load() }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button
          className="btn-secondary text-sm"
          onClick={() => setShowImport(true)}
          aria-label="Import manufacturers from Excel"
        >
          ↑ Import Excel
        </button>
        <button
          className="btn-primary text-sm"
          onClick={() => { setEditing(null); setShowModal(true) }}
          aria-label="Add a new manufacturer"
        >
          + Add Manufacturer
        </button>
      </div>

      {showImport && (
        <BulkImportModal
          entityLabel="Manufacturers"
          onDownloadTemplate={crmApi.downloadManufacturerTemplate}
          onUpload={crmApi.bulkUploadManufacturers}
          onClose={() => setShowImport(false)}
          onDone={load}
        />
      )}

      {showModal && (
        <Modal
          title={editing ? 'Edit Manufacturer' : 'Add Manufacturer'}
          onClose={() => { setShowModal(false); setEditing(null) }}
          size="lg"
        >
          <ManufacturerForm
            initial={editing ?? EMPTY_MANUFACTURER}
            onSaved={handleSaved}
            onCancel={() => { setShowModal(false); setEditing(null) }}
          />
        </Modal>
      )}

      {txnEntity && (
        <VendorTransactionModal entity={txnEntity} onClose={() => setTxnEntity(null)} isAdmin={isAdmin} />
      )}

      {viewing && (
        <DetailsModal
          title={viewing.company_name}
          onClose={() => setViewing(null)}
          rows={[
            { label: 'Vendor ID', value: viewing.vendor_id },
            { label: 'POC Name', value: viewing.poc_name },
            { label: 'Phone No', value: viewing.phone_no },
            { label: 'Email', value: viewing.email },
            { label: 'City', value: viewing.city },
            { label: 'State', value: viewing.state },
            { label: 'Address', value: viewing.address },
            { label: 'GST No', value: viewing.gst_no },
            { label: 'PAN No', value: viewing.pan_no },
            { label: 'Bank Name', value: viewing.bank_name },
            { label: 'Bank Account No', value: viewing.bank_account_no },
            { label: 'IFSC Code', value: viewing.bank_ifsc },
            { label: 'Certifications', value: CERT_FIELDS.filter((f) => viewing[f.key]).map((f) => f.label).join(', ') || 'None' },
            { label: 'Rating', value: viewing.average_rating != null ? `${viewing.average_rating} / 5` : 'No ratings' },
            { label: 'Notes', value: viewing.notes },
          ]}
        />
      )}

      {items.length === 0 ? (
        <EmptyState label="manufacturers" />
      ) : (
        <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
          <table className="w-full text-sm" aria-label="Manufacturers list">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 text-left">
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">ID</th>
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Company</th>
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">POC</th>
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">City / State</th>
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Certifications</th>
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Rating</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {items.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-black/2 dark:hover:bg-white/2 cursor-pointer"
                  tabIndex={0}
                  onClick={() => setTxnEntity({ id: m.id, vendor_id: m.vendor_id, company_name: m.company_name, kind: 'manufacturer' })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTxnEntity({ id: m.id, vendor_id: m.vendor_id, company_name: m.company_name, kind: 'manufacturer' }) } }}
                >
                  <td className="px-4 py-3 font-mono text-xs text-black/70 dark:text-slate-300">{m.vendor_id}</td>
                  <td className="px-4 py-3 font-medium text-black dark:text-white">
                    {m.company_name}
                    {m.phone_no && <div className="text-xs text-black/70 dark:text-slate-300">{m.phone_no}</div>}
                  </td>
                  <td className="px-4 py-3 text-black/70 dark:text-slate-300">{m.poc_name || '—'}</td>
                  <td className="px-4 py-3 text-black/70 dark:text-slate-300">
                    {[m.city, m.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {CERT_FIELDS.filter((f) => m[f.key]).map((f) => (
                        <span key={f.key} className="px-1.5 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded" aria-label={`Certified: ${f.label}`}>
                          {f.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3"><StarRating value={m.average_rating} /></td>
                  <td className="px-4 py-3 space-x-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setViewing(m)}
                      className="text-xs text-mustard hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                      aria-label={`View details of ${m.company_name}`}
                    >
                      View Details
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { setEditing(m); setShowModal(true) }}
                        className="text-xs text-mustard hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                        aria-label={`Edit ${m.company_name}`}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-black/70 dark:text-slate-300">Click any row to view transaction history</p>
        </div>
      )}
    </div>
  )
}

function ManufacturerForm({
  initial, onSaved, onCancel,
}: { initial: Partial<Manufacturer>; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<Partial<Manufacturer>>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field: keyof Manufacturer) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const setCheck = (field: keyof Manufacturer) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.checked }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name?.trim()) { setError('Company name is required.'); return }
    setSaving(true); setError('')
    try {
      if (form.id) {
        await crmApi.updateManufacturer(form.id, form)
      } else {
        await crmApi.createManufacturer(form)
      }
      onSaved()
    } catch (err: any) {
      const d = err.response?.data
      setError(d ? Object.values(d).flat().join(' · ') : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Manufacturer form">
      <div className="grid grid-cols-2 gap-4">
        <MField label="Company Name" required>
          <input value={form.company_name ?? ''} onChange={set('company_name')} required className={inp()} aria-required="true" />
        </MField>
        <MField label="POC Name">
          <input value={form.poc_name ?? ''} onChange={set('poc_name')} className={inp()} />
        </MField>
        <MField label="Phone No">
          <input value={form.phone_no ?? ''} onChange={set('phone_no')} className={inp()} />
        </MField>
        <MField label="Email">
          <input type="email" value={form.email ?? ''} onChange={set('email')} className={inp()} />
        </MField>
        <MField label="City">
          <input value={form.city ?? ''} onChange={set('city')} className={inp()} />
        </MField>
        <MField label="State">
          <input value={form.state ?? ''} onChange={set('state')} className={inp()} />
        </MField>
        <MField label="GST No">
          <input value={form.gst_no ?? ''} onChange={(e) => setForm((f) => ({ ...f, gst_no: e.target.value.toUpperCase() }))} className={inp()} />
        </MField>
        <MField label="PAN No">
          <input value={form.pan_no ?? ''} onChange={set('pan_no')} className={inp()} />
        </MField>
      </div>

      <MField label="Address">
        <textarea value={form.address ?? ''} onChange={set('address')} rows={2} className={inp()} />
      </MField>

      {/* Certifications */}
      <fieldset>
        <legend className="text-sm font-medium text-black dark:text-white mb-2">Certifications</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CERT_FIELDS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-black dark:text-white cursor-pointer">
              <input
                type="checkbox"
                checked={!!form[key]}
                onChange={setCheck(key)}
                className="accent-mustard w-4 h-4"
                aria-label={label}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Bank details */}
      <details>
        <summary className="text-sm font-medium text-black/60 dark:text-slate-300 cursor-pointer select-none hover:text-black dark:hover:text-white">
          Bank / Accounting Details (optional)
        </summary>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <MField label="Bank Name">
            <input value={form.bank_name ?? ''} onChange={set('bank_name')} className={inp()} />
          </MField>
          <MField label="Account No">
            <input value={form.bank_account_no ?? ''} onChange={set('bank_account_no')} className={inp()} />
          </MField>
          <MField label="IFSC Code">
            <input value={form.bank_ifsc ?? ''} onChange={set('bank_ifsc')} className={inp()} />
          </MField>
        </div>
      </details>

      <MField label="Notes">
        <textarea value={form.notes ?? ''} onChange={set('notes')} rows={2} className={inp()} placeholder="Any additional notes…" />
      </MField>

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={saving} aria-busy={saving}>
          {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Add Manufacturer'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ── Vendor Tab ────────────────────────────────────────────────────────────────

const EMPTY_VENDOR = (vendorType: VendorType): Partial<Vendor> => ({
  vendor_type: vendorType, company_name: '', poc_name: '', phone_no: '',
  email: '', city: '', bank_account_no: '', bank_ifsc: '', bank_name: '',
  pan_no: '', gst_no: '', notes: '',
})

function VendorTab({ vendorType, isAdmin }: { vendorType: VendorType; isAdmin: boolean }) {
  const [items, setItems] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [viewing, setViewing] = useState<Vendor | null>(null)
  const [txnEntity, setTxnEntity] = useState<{ id: string; vendor_id: string; company_name: string; kind: 'manufacturer' | 'vendor' } | null>(null)

  const load = () => {
    setLoading(true)
    crmApi.listVendors({ vendor_type: vendorType }).then((r) => setItems(r.data.results)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [vendorType])

  const handleSaved = () => { setShowModal(false); setEditing(null); load() }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button
          className="btn-secondary text-sm"
          onClick={() => setShowImport(true)}
          aria-label={`Import ${vendorType} vendors from Excel`}
        >
          ↑ Import Excel
        </button>
        <button
          className="btn-primary text-sm"
          onClick={() => { setEditing(null); setShowModal(true) }}
          aria-label={`Add a new ${vendorType} vendor`}
        >
          + Add Vendor
        </button>
      </div>

      {showImport && (
        <BulkImportModal
          entityLabel={`${vendorType.charAt(0).toUpperCase() + vendorType.slice(1)} Vendors`}
          onDownloadTemplate={() => crmApi.downloadVendorTemplate(vendorType)}
          onUpload={(file) => crmApi.bulkUploadVendors(vendorType, file)}
          onClose={() => setShowImport(false)}
          onDone={load}
        />
      )}

      {showModal && (
        <Modal
          title={editing ? `Edit ${vendorType} vendor` : `Add ${vendorType} vendor`}
          onClose={() => { setShowModal(false); setEditing(null) }}
          size="md"
        >
          <VendorForm
            initial={editing ?? EMPTY_VENDOR(vendorType)}
            vendorType={vendorType}
            onSaved={handleSaved}
            onCancel={() => { setShowModal(false); setEditing(null) }}
          />
        </Modal>
      )}

      {txnEntity && (
        <VendorTransactionModal entity={txnEntity} onClose={() => setTxnEntity(null)} isAdmin={isAdmin} />
      )}

      {viewing && (
        <DetailsModal
          title={viewing.company_name}
          onClose={() => setViewing(null)}
          rows={[
            { label: 'Vendor ID', value: viewing.vendor_id },
            { label: 'Vendor Type', value: viewing.vendor_type },
            { label: 'POC Name', value: viewing.poc_name },
            { label: 'Phone No', value: viewing.phone_no },
            { label: 'Email', value: viewing.email },
            { label: 'City', value: viewing.city },
            { label: 'GST No', value: viewing.gst_no },
            { label: 'PAN No', value: viewing.pan_no },
            { label: 'Bank Name', value: viewing.bank_name },
            { label: 'Bank Account No', value: viewing.bank_account_no },
            { label: 'IFSC Code', value: viewing.bank_ifsc },
            { label: 'Rating', value: viewing.average_rating != null ? `${viewing.average_rating} / 5` : 'No ratings' },
            { label: 'Notes', value: viewing.notes },
          ]}
        />
      )}

      {items.length === 0 ? (
        <EmptyState label={`${vendorType} vendors`} />
      ) : (
        <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
          <table className="w-full text-sm" aria-label={`${vendorType} vendors list`}>
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 text-left">
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">ID</th>
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Company</th>
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">POC</th>
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">City</th>
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Contact</th>
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Rating</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {items.map((v) => (
                <tr
                  key={v.id}
                  className="hover:bg-black/2 dark:hover:bg-white/2 cursor-pointer"
                  tabIndex={0}
                  onClick={() => setTxnEntity({ id: v.id, vendor_id: v.vendor_id, company_name: v.company_name, kind: 'vendor' })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTxnEntity({ id: v.id, vendor_id: v.vendor_id, company_name: v.company_name, kind: 'vendor' }) } }}
                >
                  <td className="px-4 py-3 font-mono text-xs text-black/70 dark:text-slate-300">{v.vendor_id}</td>
                  <td className="px-4 py-3 font-medium text-black dark:text-white">{v.company_name}</td>
                  <td className="px-4 py-3 text-black/70 dark:text-slate-300">{v.poc_name || '—'}</td>
                  <td className="px-4 py-3 text-black/70 dark:text-slate-300">{v.city || '—'}</td>
                  <td className="px-4 py-3 text-black/70 dark:text-slate-300">
                    {v.phone_no && <div>{v.phone_no}</div>}
                    {v.email && <div className="text-xs">{v.email}</div>}
                  </td>
                  <td className="px-4 py-3"><StarRating value={v.average_rating} /></td>
                  <td className="px-4 py-3 space-x-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setViewing(v)}
                      className="text-xs text-mustard hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                      aria-label={`View details of ${v.company_name}`}
                    >
                      View Details
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { setEditing(v); setShowModal(true) }}
                        className="text-xs text-mustard hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                        aria-label={`Edit ${v.company_name}`}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-black/70 dark:text-slate-300">Click any row to view transaction history</p>
        </div>
      )}
    </div>
  )
}

function VendorForm({
  initial, vendorType, onSaved, onCancel,
}: { initial: Partial<Vendor>; vendorType: VendorType; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<Partial<Vendor>>({ ...initial, vendor_type: vendorType })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field: keyof Vendor) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name?.trim()) { setError('Company name is required.'); return }
    setSaving(true); setError('')
    try {
      if (form.id) {
        await crmApi.updateVendor(form.id, form)
      } else {
        await crmApi.createVendor(form)
      }
      onSaved()
    } catch (err: any) {
      const d = err.response?.data
      setError(d ? Object.values(d).flat().join(' · ') : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label={`${vendorType} vendor form`}>
      <div className="grid grid-cols-2 gap-4">
        <MField label="Company Name" required>
          <input value={form.company_name ?? ''} onChange={set('company_name')} required className={inp()} aria-required="true" />
        </MField>
        <MField label="POC Name">
          <input value={form.poc_name ?? ''} onChange={set('poc_name')} className={inp()} />
        </MField>
        <MField label="Phone No">
          <input value={form.phone_no ?? ''} onChange={set('phone_no')} className={inp()} />
        </MField>
        <MField label="Email">
          <input type="email" value={form.email ?? ''} onChange={set('email')} className={inp()} />
        </MField>
        <MField label="City">
          <input value={form.city ?? ''} onChange={set('city')} className={inp()} />
        </MField>
      </div>

      <details>
        <summary className="text-sm font-medium text-black/60 dark:text-slate-300 cursor-pointer select-none hover:text-black dark:hover:text-white">
          Bank / Accounting Details (optional)
        </summary>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <MField label="Bank Name">
            <input value={form.bank_name ?? ''} onChange={set('bank_name')} className={inp()} />
          </MField>
          <MField label="Account No">
            <input value={form.bank_account_no ?? ''} onChange={set('bank_account_no')} className={inp()} />
          </MField>
          <MField label="IFSC Code">
            <input value={form.bank_ifsc ?? ''} onChange={set('bank_ifsc')} className={inp()} />
          </MField>
          <MField label="GST No">
            <input value={form.gst_no ?? ''} onChange={(e) => setForm((f) => ({ ...f, gst_no: e.target.value.toUpperCase() }))} className={inp()} />
          </MField>
          <MField label="PAN No">
            <input value={form.pan_no ?? ''} onChange={set('pan_no')} className={inp()} />
          </MField>
        </div>
      </details>

      <MField label="Notes">
        <textarea value={form.notes ?? ''} onChange={set('notes')} rows={2} className={inp()} placeholder="Any additional notes…" />
      </MField>

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={saving} aria-busy={saving}>
          {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Add Vendor'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ── Internal Team Tab ─────────────────────────────────────────────────────────

const EMPTY_MEMBER = (team: 'formulation' | 'sales' | 'ops' | 'admin'): Partial<InternalTeamMember> => ({
  team, name: '', email: '', phone_no: '',
})

function InternalTeamTab({ team, isAdmin }: { team: 'formulation' | 'sales' | 'ops' | 'admin'; isAdmin: boolean }) {
  const [members, setMembers] = useState<InternalTeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<InternalTeamMember | null>(null)

  const load = () => {
    setLoading(true)
    crmApi.listTeamMembers(team).then((r) => setMembers(r.data.results)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [team])

  const handleSaved = () => { setShowModal(false); setEditing(null); load() }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          className="btn-primary text-sm"
          onClick={() => { setEditing(null); setShowModal(true) }}
          aria-label={`Add a new ${team} team member`}
        >
          + Add Member
        </button>
      </div>

      {showModal && (
        <Modal
          title={editing ? 'Edit Team Member' : `Add ${team === 'formulation' ? 'Formulation' : team === 'sales' ? 'Sales' : team === 'ops' ? 'Ops' : 'Admin'} Team Member`}
          onClose={() => { setShowModal(false); setEditing(null) }}
          size="sm"
        >
          <TeamMemberForm
            initial={editing ?? EMPTY_MEMBER(team)}
            onSaved={handleSaved}
            onCancel={() => { setShowModal(false); setEditing(null) }}
          />
        </Modal>
      )}

      {members.length === 0 ? (
        <EmptyState label={`${team} team members`} />
      ) : (
        <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
          <table className="w-full text-sm" aria-label={`${team} team members`}>
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 text-left">
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Name</th>
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Email</th>
                <th scope="col" className="px-4 py-3 font-semibold text-black dark:text-white">Phone</th>
                {isAdmin && <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-black/2 dark:hover:bg-white/2">
                  <td className="px-4 py-3 font-medium text-black dark:text-white">{m.name}</td>
                  <td className="px-4 py-3 text-black/70 dark:text-slate-300">{m.email || '—'}</td>
                  <td className="px-4 py-3 text-black/70 dark:text-slate-300">{m.phone_no || '—'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setEditing(m); setShowModal(true) }}
                        className="text-xs text-mustard hover:underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                        aria-label={`Edit ${m.name}`}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TeamMemberForm({
  initial, onSaved, onCancel,
}: { initial: Partial<InternalTeamMember>; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<Partial<InternalTeamMember>>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field: keyof InternalTeamMember) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name?.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    try {
      if (form.id) {
        await crmApi.updateTeamMember(form.id, form)
      } else {
        await crmApi.createTeamMember(form)
      }
      onSaved()
    } catch (err: any) {
      const d = err.response?.data
      setError(d ? Object.values(d).flat().join(' · ') : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Team member form">
      <MField label="Name" required>
        <input value={form.name ?? ''} onChange={set('name')} required className={inp()} aria-required="true" />
      </MField>
      <MField label="Email">
        <input type="email" value={form.email ?? ''} onChange={set('email')} className={inp()} />
      </MField>
      <MField label="Phone No">
        <input value={form.phone_no ?? ''} onChange={set('phone_no')} className={inp()} />
      </MField>

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={saving} aria-busy={saving}>
          {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Add Member'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ── Vendor Transaction History Modal ─────────────────────────────────────────

const fmtAmount = (n: string | number) =>
  Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface VendorTransactionModalProps {
  entity: { id: string; vendor_id: string; company_name: string; kind: 'manufacturer' | 'vendor' }
  onClose: () => void
  isAdmin: boolean
}

function TxnForm({
  entity, initial, onSaved, onCancel,
}: {
  entity: VendorTransactionModalProps['entity']
  initial: ProjectPayment | null
  onSaved: () => void
  onCancel: () => void
}) {
  const [direction, setDirection] = useState<PaymentDirection>(initial?.direction ?? 'paid')
  const [subType, setSubType] = useState(initial?.sub_type ?? DEFAULT_SUB_TYPE.paid)
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [paymentDate, setPaymentDate] = useState(initial?.payment_date ?? new Date().toISOString().slice(0, 10))
  const [comments, setComments] = useState(initial?.comments ?? '')
  const [projectId, setProjectId] = useState(initial?.project ?? '')
  const [projects, setProjects] = useState<CRMProjectList[]>([])
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Client combobox state (multi-select)
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<Client[]>([])
  const [selectedClients, setSelectedClients] = useState<Client[]>(
    initial?.clients?.map((phone, i) => ({ phone_no: phone, name: initial.client_names?.[i] ?? '' } as Client)) ?? [],
  )
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    crmApi.listProjects().then((r) => {
      setProjects(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])
    })
  }, [])

  const handleDirectionChange = (dir: PaymentDirection) => {
    setDirection(dir)
    setSubType(DEFAULT_SUB_TYPE[dir])
  }

  const handleProjectChange = (pid: string) => {
    setProjectId(pid)
    if (pid) {
      const proj = projects.find((p) => p.id === pid)
      if (proj) {
        setSelectedClients((prev) =>
          prev.some((c) => c.phone_no === proj.client) ? prev : [...prev, { phone_no: proj.client, name: proj.client_name } as Client],
        )
      }
    }
  }

  const handleClientSearchChange = (value: string) => {
    setClientSearch(value)
    if (!value.trim()) { setClientResults([]); setClientDropdownOpen(false); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const data = await clientService.list({ q: value.trim() })
      const results = Array.isArray(data) ? data : (data as any).results ?? []
      setClientResults(results)
      setClientDropdownOpen(true)
    }, 300)
  }

  const addClient = (c: Client) => {
    setSelectedClients((prev) => (prev.some((sc) => sc.phone_no === c.phone_no) ? prev : [...prev, c]))
    setClientSearch('')
    setClientDropdownOpen(false)
  }

  const removeClient = (phoneNo: string) => {
    setSelectedClients((prev) => prev.filter((c) => c.phone_no !== phoneNo))
  }

  const handleSave = async () => {
    if (!paymentDate) { setError('Date is required.'); return }
    setSaving(true)
    setError('')
    const fd = new FormData()
    fd.append('payment_date', paymentDate)
    fd.append('direction', direction)
    fd.append('sub_type', subType)
    fd.append('amount', amount || '0')
    fd.append('comments', comments)
    if (projectId) fd.append('project', projectId)
    selectedClients.forEach((c) => fd.append('clients', c.phone_no))
    if (entity.kind === 'manufacturer') fd.append('manufacturer', entity.id)
    else fd.append('vendor', entity.id)
    if (invoiceFile) fd.append('invoice', invoiceFile)
    try {
      if (initial) await crmApi.updateProjectPayment(initial.id, fd)
      else await crmApi.createProjectPayment(fd)
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const subTypes = SUB_TYPES_BY_DIRECTION[direction] ?? []

  return (
    <div className="bg-black/3 dark:bg-white/3 rounded-lg p-4 space-y-3 text-sm mb-4">
      <p className="font-medium text-black dark:text-white text-xs uppercase tracking-wide">
        {initial ? 'Edit Transaction' : 'New Transaction'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-black/60 dark:text-slate-400 mb-1">Date *</label>
          <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard" disabled={saving} />
        </div>
        <div>
          <label className="block text-xs text-black/60 dark:text-slate-400 mb-1">Amount (₹)</label>
          <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard" disabled={saving} />
        </div>
      </div>

      <fieldset>
        <legend className="block text-xs text-black/60 dark:text-slate-400 mb-1">Payment Type</legend>
        <div className="space-y-1">
          <div className="flex rounded border border-black/20 dark:border-white/20 overflow-hidden" role="group" aria-label="Actual payment type">
            {(['paid', 'received'] as PaymentDirection[]).map((dir) => (
              <button key={dir} type="button" onClick={() => handleDirectionChange(dir)} disabled={saving}
                aria-pressed={direction === dir}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${direction === dir ? 'bg-mustard text-black' : 'bg-white dark:bg-slate-700 text-black/60 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                {dir === 'paid' ? 'Paid' : 'Received'}
              </button>
            ))}
          </div>
          <div className="flex rounded border border-black/20 dark:border-white/20 overflow-hidden" role="group" aria-label="Pending payment type">
            {(['payable', 'receivable'] as PaymentDirection[]).map((dir) => (
              <button key={dir} type="button" onClick={() => handleDirectionChange(dir)} disabled={saving}
                aria-pressed={direction === dir}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${direction === dir ? 'bg-mustard text-black' : 'bg-white dark:bg-slate-700 text-black/60 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                {dir === 'payable' ? 'Payable' : 'Receivable'}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      <div>
        <label className="block text-xs text-black/60 dark:text-slate-400 mb-1">Sub Type</label>
        <select value={subType} onChange={(e) => setSubType(e.target.value)}
          className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard" disabled={saving}>
          {subTypes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs text-black/60 dark:text-slate-400 mb-1">
          Link to Project <span className="text-black/30 dark:text-slate-500">(optional)</span>
        </label>
        <select value={projectId} onChange={(e) => handleProjectChange(e.target.value)}
          className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard" disabled={saving}>
          <option value="">— None —</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.project_no} — {p.client_name}</option>)}
        </select>
      </div>

      <div className="relative">
        <label className="block text-xs text-black/60 dark:text-slate-400 mb-1">
          Clients <span className="text-black/30 dark:text-slate-500">(optional, multiple allowed)</span>
        </label>
        {selectedClients.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {selectedClients.map((c) => (
              <span key={c.phone_no}
                className="flex items-center gap-1 border border-black/20 dark:border-white/20 rounded-full pl-2.5 pr-1.5 py-1 bg-white dark:bg-slate-700">
                <span className="text-xs text-black dark:text-white truncate max-w-[160px]">{c.name} <span className="text-black/40 dark:text-slate-500">({c.phone_no})</span></span>
                <button type="button" onClick={() => removeClient(c.phone_no)} aria-label={`Remove ${c.name}`}
                  className="shrink-0 text-black/40 dark:text-slate-400 hover:text-black dark:hover:text-white text-sm leading-none">×</button>
              </span>
            ))}
          </div>
        )}
        <input type="text" value={clientSearch} onChange={(e) => handleClientSearchChange(e.target.value)}
          onFocus={() => clientResults.length > 0 && setClientDropdownOpen(true)}
          placeholder="Search by name or phone to add a client…"
          className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard" disabled={saving} />
        {clientDropdownOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-800 border border-black/15 dark:border-white/15 rounded shadow-lg">
            {clientResults.length === 0 ? (
              <p className="px-3 py-2 text-xs text-black/40 dark:text-slate-500">No clients found</p>
            ) : (
              clientResults
                .filter((c) => !selectedClients.some((sc) => sc.phone_no === c.phone_no))
                .map((c) => (
                  <button key={c.phone_no} type="button"
                    onClick={() => addClient(c)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-mustard/10">
                    <span className="text-black dark:text-white">{c.name}</span>
                    <span className="block text-xs text-black/40 dark:text-slate-500">{c.phone_no}</span>
                  </button>
                ))
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs text-black/60 dark:text-slate-400 mb-1">Comments</label>
        <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2}
          className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard resize-none" disabled={saving} placeholder="Optional notes…" />
      </div>

      <div>
        <label className="block text-xs text-black/60 dark:text-slate-400 mb-1">
          Invoice {initial?.invoice_filename ? '(upload new to replace)' : '(optional)'}
        </label>
        {initial?.invoice_filename && !invoiceFile && (
          <p className="text-xs text-mustard mb-1 truncate">Current: {initial.invoice_filename}</p>
        )}
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
          className="w-full text-xs text-black/60 dark:text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-mustard/10 file:text-black dark:file:text-white" disabled={saving} />
      </div>

      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary flex-1 text-xs py-1.5">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-secondary flex-1 text-xs py-1.5">
          Cancel
        </button>
      </div>
    </div>
  )
}

function VendorTransactionModal({ entity, onClose, isAdmin }: VendorTransactionModalProps) {
  const [payments, setPayments] = useState<ProjectPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [formState, setFormState] = useState<'none' | 'new' | ProjectPayment>('none')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchPayments = () =>
    crmApi.listVendorPayments(entity.kind, entity.id)
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : (r.data as any).results ?? []
        setPayments(data)
      })
      .finally(() => setLoading(false))

  useEffect(() => { fetchPayments() }, [entity.id, entity.kind])

  const handleSaved = () => { setFormState('none'); fetchPayments() }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await crmApi.deleteProjectPayment(id)
      await fetchPayments()
    } finally {
      setDeletingId(null)
    }
  }

  const handleSettle = async (p: ProjectPayment) => {
    const fd = new FormData()
    fd.append('payment_date', new Date().toISOString().slice(0, 10))
    fd.append('amount', p.amount)
    fd.append('sub_type', p.sub_type)
    await crmApi.settleProjectPayment(p.id, fd)
    fetchPayments()
  }

  const totalPaid = payments.filter((p) => p.direction === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const totalReceived = payments.filter((p) => p.direction === 'received').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <Modal
      title={`Transactions — [${entity.vendor_id}] ${entity.company_name}`}
      onClose={onClose}
      size="lg"
    >
      <div className="flex justify-end mb-3">
        {formState === 'none' && (
          <button type="button" className="btn-primary text-sm" onClick={() => setFormState('new')}>
            + Add Transaction
          </button>
        )}
      </div>

      {formState !== 'none' && (
        <TxnForm
          entity={entity}
          initial={formState === 'new' ? null : formState}
          onSaved={handleSaved}
          onCancel={() => setFormState('none')}
        />
      )}

      {loading ? (
        <p className="text-sm text-black/70 dark:text-slate-300 py-4">Loading…</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-black/70 dark:text-slate-300 py-4">No payment transactions recorded yet.</p>
      ) : (
        <div className="space-y-4">
          {/* Summary strip */}
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-black/70 dark:text-slate-300 text-xs">Total Paid</span>
              <p className="font-semibold text-red-600 dark:text-red-400">₹{fmtAmount(totalPaid)}</p>
            </div>
            <div>
              <span className="text-black/70 dark:text-slate-300 text-xs">Total Received</span>
              <p className="font-semibold text-green-600 dark:text-green-400">₹{fmtAmount(totalReceived)}</p>
            </div>
            {isAdmin && (
              <div>
                <span className="text-black/70 dark:text-slate-300 text-xs">Net P&amp;L</span>
                <p className={`font-semibold ${totalReceived - totalPaid >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {totalReceived - totalPaid >= 0 ? '+' : ''}₹{fmtAmount(totalReceived - totalPaid)}
                </p>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 text-left">
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300">Date</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300">Type</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300">Sub Type</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300 text-right">Amount (₹)</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300">Project</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300">Client</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300">Comments</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300">By</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300">Invoice</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-black/2 dark:hover:bg-white/2">
                    <td className="px-3 py-2 text-black/70 dark:text-slate-300 whitespace-nowrap">
                      {new Date(p.payment_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${DIRECTION_BADGE[p.direction]}`}>
                        {p.direction.charAt(0).toUpperCase() + p.direction.slice(1)}
                      </span>
                      {p.is_settled && (
                        <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">✓</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-black dark:text-white">{p.sub_type_display}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${DIRECTION_AMOUNT[p.direction]}`}>
                      ₹{fmtAmount(p.amount)}
                    </td>
                    <td className="px-3 py-2">
                      {p.project ? (
                        <>
                          <Link
                            to={`/crm/projects/${p.project}`}
                            className="text-mustard hover:underline text-xs font-mono"
                            onClick={onClose}
                          >
                            {p.project_no}
                          </Link>
                          {p.project_client_name && (
                            <div className="text-xs text-black/70 dark:text-slate-300">{p.project_client_name}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-black/70 dark:text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-black/70 dark:text-slate-300 text-xs">
                      {p.client_names.length > 0 ? p.client_names.join(', ') : '—'}
                    </td>
                    <td className="px-3 py-2 text-black/60 dark:text-slate-300 max-w-[120px]">
                      <span className="truncate block">{p.comments || '—'}</span>
                    </td>
                    <td className="px-3 py-2 text-black/70 dark:text-slate-300 text-xs whitespace-nowrap">
                      <div>{p.created_by_name || '—'}</div>
                      <div className="text-black/70 dark:text-slate-300">
                        {new Date(p.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {p.invoice_filename ? (
                        <a
                          href={p.invoice_drive_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-mustard hover:underline inline-flex items-center gap-1"
                        >
                          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="max-w-[80px] truncate">{p.invoice_filename}</span>
                        </a>
                      ) : (
                        <span className="text-black/70 dark:text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex gap-2">
                        {!p.is_settled && (p.direction === 'payable' || p.direction === 'receivable') && (
                          <button type="button" onClick={() => handleSettle(p)} className="text-xs text-mustard hover:underline font-medium">
                            Settle
                          </button>
                        )}
                        {!p.is_settled && (
                          <button type="button" onClick={() => setFormState(p)} className="text-xs text-mustard hover:underline">
                            Edit
                          </button>
                        )}
                        {isAdmin && (
                          <button type="button" onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                            className="text-xs text-red-500 hover:underline disabled:opacity-50">
                            {deletingId === p.id ? '…' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Bulk Import Modal ─────────────────────────────────────────────────────────

interface BulkImportResult {
  created: { row: number; company_name: string; vendor_id: string }[]
  skipped: { row: number; company_name: string; reason: string }[]
}

interface BulkImportModalProps {
  entityLabel: string
  onDownloadTemplate: () => Promise<any>
  onUpload: (file: File) => Promise<{ data: BulkImportResult }>
  onClose: () => void
  onDone: () => void
}

function BulkImportModal({ entityLabel, onDownloadTemplate, onUpload, onClose, onDone }: BulkImportModalProps) {
  const [uploading, setUploading] = React.useState(false)
  const [result, setResult] = React.useState<BulkImportResult | null>(null)
  const [error, setError] = React.useState('')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDownload = async () => {
    try {
      const res = await onDownloadTemplate()
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${entityLabel.toLowerCase().replace(/\s+/g, '_')}_template.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to download template.')
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setResult(null); setUploading(true)
    try {
      const res = await onUpload(file)
      setResult(res.data)
      if (res.data.created.length > 0) onDone()
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Upload failed. Please check your file and try again.'
      setError(msg)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Modal title={`Import ${entityLabel} from Excel`} onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* Step 1 */}
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-mustard text-black text-xs font-bold flex items-center justify-center mt-0.5">1</span>
          <div>
            <p className="text-sm font-medium text-black dark:text-white">Download the template</p>
            <p className="text-xs text-black/60 dark:text-slate-400 mb-2">Fill in your data starting from row 4. Row 1 = headers, row 2 = hints, row 3 = example.</p>
            <button onClick={handleDownload} className="btn-secondary text-sm">
              ↓ Download Template
            </button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-mustard text-black text-xs font-bold flex items-center justify-center mt-0.5">2</span>
          <div className="w-full">
            <p className="text-sm font-medium text-black dark:text-white">Upload your filled file</p>
            <p className="text-xs text-black/60 dark:text-slate-400 mb-2">Only <code>.xlsx</code> files. Duplicates (same company name) will be skipped.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-primary text-sm"
              aria-busy={uploading}
            >
              {uploading ? 'Uploading…' : '↑ Choose File & Upload'}
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {/* Results */}
        {result && (
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="flex-1 rounded border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3">
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">Created</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{result.created.length}</p>
              </div>
              <div className="flex-1 rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Skipped</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{result.skipped.length}</p>
              </div>
            </div>

            {result.created.length > 0 && (
              <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10 max-h-48">
                <table className="w-full text-xs" aria-label="Created entries">
                  <thead className="bg-black/5 dark:bg-white/5 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-black dark:text-white">Row</th>
                      <th className="px-3 py-2 text-left font-semibold text-black dark:text-white">Company</th>
                      <th className="px-3 py-2 text-left font-semibold text-black dark:text-white">ID Assigned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {result.created.map((r) => (
                      <tr key={r.row} className="text-green-700 dark:text-green-400">
                        <td className="px-3 py-1.5">{r.row}</td>
                        <td className="px-3 py-1.5">{r.company_name}</td>
                        <td className="px-3 py-1.5 font-mono">{r.vendor_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.skipped.length > 0 && (
              <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10 max-h-48">
                <table className="w-full text-xs" aria-label="Skipped entries">
                  <thead className="bg-black/5 dark:bg-white/5 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-black dark:text-white">Row</th>
                      <th className="px-3 py-2 text-left font-semibold text-black dark:text-white">Company</th>
                      <th className="px-3 py-2 text-left font-semibold text-black dark:text-white">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {result.skipped.map((r) => (
                      <tr key={r.row} className="text-amber-700 dark:text-amber-400">
                        <td className="px-3 py-1.5">{r.row}</td>
                        <td className="px-3 py-1.5">{r.company_name}</td>
                        <td className="px-3 py-1.5">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function inp() {
  return 'w-full border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard'
}

function MField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-black/60 dark:text-slate-300 mb-1">
        {label}{required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id })
        : children}
    </div>
  )
}

function StarRating({ value }: { value: number | null }) {
  if (value === null) return <span className="text-black/70 dark:text-slate-300 text-xs">No ratings</span>
  return (
    <span aria-label={`Rating: ${value} out of 5 stars`} className="text-sm">
      {'★'.repeat(Math.round(value))}{'☆'.repeat(5 - Math.round(value))}
      <span className="text-black/70 dark:text-slate-300 text-xs ml-1">({value})</span>
    </span>
  )
}

function DetailsModal({
  title, rows, onClose,
}: { title: string; rows: Array<{ label: string; value: React.ReactNode }>; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose} size="md">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-xs font-medium text-black/60 dark:text-slate-300">{r.label}</dt>
            <dd className="text-black dark:text-white break-words">{r.value || '—'}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}

function LoadingState() {
  return <div role="status" aria-live="polite" className="text-black/60 dark:text-slate-300 text-sm py-4">Loading…</div>
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-black/60 dark:text-slate-300 text-sm py-4">No {label} added yet.</p>
}
