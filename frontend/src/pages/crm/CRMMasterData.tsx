import React, { useEffect, useRef, useState, useId } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { crmApi } from '@/services/crm'
import type { Manufacturer, Vendor, InternalTeamMember, VendorType, ProjectPayment } from '@/types/crm'
import { useAuthStore } from '@/store/authStore'
import { Modal } from '@/components/crm/Modal'

type Tab = 'manufacturers' | 'packaging' | 'printing' | 'testing' | 'designer' | 'ecommerce' | 'logistics' | 'formulation' | 'sales' | 'ops'

const TABS: { id: Tab; label: string }[] = [
  { id: 'manufacturers', label: 'Manufacturers' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'printing', label: 'Printing' },
  { id: 'testing', label: 'Testing Services' },
  { id: 'designer', label: 'Designers' },
  { id: 'ecommerce', label: 'Ecommerce' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'formulation', label: 'Formulation Team' },
  { id: 'sales', label: 'Sales Team' },
  { id: 'ops', label: 'Ops Team' },
]

const VENDOR_TABS: VendorType[] = ['packaging', 'printing', 'testing', 'designer', 'ecommerce', 'logistics']
const INTERNAL_TABS = ['formulation', 'sales', 'ops'] as const

export default function CRMMasterData() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const [activeTab, setActiveTab] = useState<Tab>('manufacturers')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const tabValues = TABS.map((t) => t.id)

  const handleTabKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let next = -1
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      next = (currentIndex + 1) % tabValues.length
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      next = (currentIndex - 1 + tabValues.length) % tabValues.length
    } else if (e.key === 'Home') {
      e.preventDefault()
      next = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      next = tabValues.length - 1
    }
    if (next >= 0) {
      setActiveTab(tabValues[next])
      tabRefs.current[next]?.focus()
    }
  }

  return (
    <Layout title="Master Data">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-black dark:text-white">Master Data</h1>

        <div role="tablist" aria-label="Master data categories" className="flex flex-wrap gap-1 border-b border-black/10 dark:border-white/10">
          {TABS.map((tab, index) => (
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
          {VENDOR_TABS.includes(activeTab as VendorType) && (
            <VendorTab vendorType={activeTab as VendorType} isAdmin={isAdmin} />
          )}
          {INTERNAL_TABS.includes(activeTab as typeof INTERNAL_TABS[number]) && (
            <InternalTeamTab team={activeTab as 'formulation' | 'sales' | 'ops'} isAdmin={isAdmin} />
          )}
        </div>
      </div>
    </Layout>
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
  const [editing, setEditing] = useState<Manufacturer | null>(null)
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
      <div className="flex justify-end">
        <button
          className="btn-primary text-sm"
          onClick={() => { setEditing(null); setShowModal(true) }}
          aria-label="Add a new manufacturer"
        >
          + Add Manufacturer
        </button>
      </div>

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
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
  const [editing, setEditing] = useState<Vendor | null>(null)
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
      <div className="flex justify-end">
        <button
          className="btn-primary text-sm"
          onClick={() => { setEditing(null); setShowModal(true) }}
          aria-label={`Add a new ${vendorType} vendor`}
        >
          + Add Vendor
        </button>
      </div>

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
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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

const EMPTY_MEMBER = (team: 'formulation' | 'sales' | 'ops'): Partial<InternalTeamMember> => ({
  team, name: '', email: '', phone_no: '',
})

function InternalTeamTab({ team, isAdmin }: { team: 'formulation' | 'sales' | 'ops'; isAdmin: boolean }) {
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
          title={editing ? 'Edit Team Member' : `Add ${team === 'formulation' ? 'Formulation' : team === 'sales' ? 'Sales' : 'Ops'} Team Member`}
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

function VendorTransactionModal({ entity, onClose, isAdmin }: VendorTransactionModalProps) {
  const [payments, setPayments] = useState<ProjectPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    crmApi.listVendorPayments(entity.kind, entity.id)
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : (r.data as any).results ?? []
        setPayments(data)
      })
      .finally(() => setLoading(false))
  }, [entity.id, entity.kind])

  const totalPaid = payments.filter((p) => p.direction === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const totalReceived = payments.filter((p) => p.direction === 'received').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <Modal
      title={`Transactions — [${entity.vendor_id}] ${entity.company_name}`}
      onClose={onClose}
      size="lg"
    >
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
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300">Comments</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300">By</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-black/70 dark:text-slate-300">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-black/2 dark:hover:bg-white/2">
                    <td className="px-3 py-2 text-black/70 dark:text-slate-300 whitespace-nowrap">
                      {new Date(p.payment_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                        p.direction === 'paid'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {p.direction === 'paid' ? 'Paid' : 'Received'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-black dark:text-white">{p.sub_type_display}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${
                      p.direction === 'paid' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      ₹{fmtAmount(p.amount)}
                    </td>
                    <td className="px-3 py-2">
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

function LoadingState() {
  return <div role="status" aria-live="polite" className="text-black/60 dark:text-slate-300 text-sm py-4">Loading…</div>
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-black/60 dark:text-slate-300 text-sm py-4">No {label} added yet.</p>
}
