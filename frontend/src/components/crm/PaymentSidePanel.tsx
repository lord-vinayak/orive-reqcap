import { useEffect, useId, useRef, useState } from 'react'
import { crmApi } from '@/services/crm'
import type { ProjectPayment, PaymentDirection, PaymentSubType, PaymentVendorOption } from '@/types/crm'
import { useAuthStore } from '@/store/authStore'

// ── Constants ────────────────────────────────────────────────────────────────

const PAID_SUB_TYPES: { value: string; label: string }[] = [
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'derma_testing', label: 'Derma Testing' },
  { value: 'batch_testing', label: 'Batch Testing' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'printing', label: 'Printing' },
  { value: 'samples', label: 'Samples' },
  { value: 'others', label: 'Others' },
]

const RECEIVED_SUB_TYPES: { value: string; label: string }[] = [
  { value: 'sample', label: 'Sample' },
  { value: 'production', label: 'Production' },
  { value: 'design', label: 'Design' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'printing', label: 'Printing' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'testing', label: 'Testing' },
  { value: 'others', label: 'Others' },
]

export const SUB_TYPES_BY_DIRECTION: Record<string, { value: string; label: string }[]> = {
  paid: PAID_SUB_TYPES,
  payable: PAID_SUB_TYPES,
  received: RECEIVED_SUB_TYPES,
  receivable: RECEIVED_SUB_TYPES,
}

export const DEFAULT_SUB_TYPE: Record<string, string> = {
  paid: 'manufacturing',
  payable: 'manufacturing',
  received: 'sample',
  receivable: 'sample',
}

export const DIRECTION_BADGE: Record<string, string> = {
  paid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  received: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  payable: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  receivable: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

export const DIRECTION_AMOUNT: Record<string, string> = {
  paid: 'text-red-600 dark:text-red-400',
  received: 'text-green-600 dark:text-green-400',
  payable: 'text-amber-600 dark:text-amber-400',
  receivable: 'text-blue-600 dark:text-blue-400',
}

const fmt = (val: string | number) =>
  Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Form state ───────────────────────────────────────────────────────────────

interface PaymentFormState {
  payment_date: string
  direction: PaymentDirection
  sub_type: string
  amount: string
  vendor_id_selected: string
  vendor_kind: 'vendor' | 'manufacturer' | ''
  comments: string
  invoice_file: File | null
}

const emptyForm = (direction: PaymentDirection = 'paid'): PaymentFormState => ({
  payment_date: new Date().toISOString().slice(0, 10),
  direction,
  sub_type: DEFAULT_SUB_TYPE[direction],
  amount: '',
  vendor_id_selected: '',
  vendor_kind: '',
  comments: '',
  invoice_file: null,
})

function formFromPayment(p: ProjectPayment): PaymentFormState {
  const hasVendor = !!p.vendor
  const hasMfr = !!p.manufacturer
  return {
    payment_date: p.payment_date,
    direction: p.direction,
    sub_type: p.sub_type,
    amount: p.amount,
    vendor_id_selected: hasVendor ? p.vendor! : hasMfr ? p.manufacturer! : '',
    vendor_kind: hasVendor ? 'vendor' : hasMfr ? 'manufacturer' : '',
    comments: p.comments,
    invoice_file: null,
  }
}

// ── Vendor search ─────────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = {
  manufacturer: 'Manufacturer',
  packaging: 'Packaging', printing: 'Printing', testing: 'Testing',
  designer: 'Designer', ecommerce: 'Ecommerce', logistics: 'Logistics',
}

interface VendorSearchProps {
  options: PaymentVendorOption[]
  selectedId: string
  selectedKind: 'vendor' | 'manufacturer' | ''
  onSelect: (id: string, kind: 'vendor' | 'manufacturer') => void
  onClear: () => void
  disabled?: boolean
}

function VendorSearch({ options, selectedId, selectedKind, onSelect, onClear, disabled }: VendorSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const selected = options.find((o) => o.id === selectedId && (selectedKind === '' || o.kind === selectedKind))

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.company_name.toLowerCase().includes(query.toLowerCase()) ||
          o.vendor_id.toLowerCase().includes(query.toLowerCase())
      )
    : options

  const handleSelect = (o: PaymentVendorOption) => {
    onSelect(o.id, o.kind)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      {selected ? (
        <div className="flex items-center justify-between gap-2 border border-black/20 dark:border-white/20 rounded px-2 py-1.5 bg-white dark:bg-slate-700">
          <span className="text-sm text-black dark:text-white truncate">
            <span className="text-black/40 dark:text-slate-400 text-xs mr-1 font-mono">[{selected.vendor_id}]</span>
            {selected.company_name}
            {selected.city && <span className="text-xs text-black/40 dark:text-slate-500 ml-1">({selected.city})</span>}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={() => { onClear(); setQuery('') }}
              className="shrink-0 text-black/40 dark:text-slate-400 hover:text-black dark:hover:text-white text-lg leading-none"
              aria-label="Clear selection"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
          placeholder="Search by name or ID (e.g. MFR-001)…"
          aria-label="Search vendor or manufacturer by name or ID"
          className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
          disabled={disabled}
        />
      )}

      {open && !selected && (
        // ponytail: options stay real focusable <button>s (Tab-reachable) instead of a full
        // roving-tabindex/aria-activedescendant combobox — simplest thing that's actually
        // keyboard-operable; revisit if a list ever gets long enough that Tab-per-row is painful
        <div id={listboxId} role="listbox" aria-label="Vendor and manufacturer results" className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white dark:bg-slate-800 border border-black/15 dark:border-white/15 rounded shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-black/40 dark:text-slate-500">No results</p>
          ) : (
            filtered.slice(0, 50).map((o) => (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => handleSelect(o)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-mustard/10 dark:hover:bg-mustard/10 flex items-center gap-2"
              >
                <span className="text-xs text-black/40 dark:text-slate-400 shrink-0 font-mono w-16">{o.vendor_id}</span>
                <span className="text-black dark:text-white flex-1 truncate">{o.company_name}</span>
                <span className="text-xs text-black/30 dark:text-slate-500 shrink-0">
                  {KIND_LABEL[o.vendor_type ?? o.kind]}
                  {o.city && ` · ${o.city}`}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Payment form ──────────────────────────────────────────────────────────────

interface PaymentFormProps {
  form: PaymentFormState
  vendorOptions: PaymentVendorOption[]
  onChange: (fields: Partial<PaymentFormState>) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  error: string
  isNew: boolean
  isSettling?: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  existingInvoice?: string
}

function PaymentForm({ form, vendorOptions, onChange, onSave, onCancel, saving, error, isNew, isSettling, fileInputRef, existingInvoice }: PaymentFormProps) {
  const rawId = useId()
  const uid = rawId.replace(/:/g, '')
  const subTypes = SUB_TYPES_BY_DIRECTION[form.direction] ?? PAID_SUB_TYPES

  const handleDirectionChange = (dir: PaymentDirection) => {
    onChange({ direction: dir, sub_type: DEFAULT_SUB_TYPE[dir], vendor_id_selected: '', vendor_kind: '' })
  }

  const title = isSettling ? 'Settle Entry' : isNew ? 'New Payment Entry' : 'Edit Entry'

  return (
    <div className="bg-black/3 dark:bg-white/3 rounded-lg p-4 space-y-3 text-sm">
      <p className="font-medium text-black dark:text-white text-xs uppercase tracking-wide">
        {title}
      </p>

      {/* Row 1: Date */}
      <div>
        <label htmlFor={`pf-date-${uid}`} className="block text-xs text-black/60 dark:text-slate-400 mb-1">Date *</label>
        <input
          id={`pf-date-${uid}`}
          type="date"
          value={form.payment_date}
          onChange={(e) => onChange({ payment_date: e.target.value })}
          className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
          disabled={saving}
        />
      </div>

      {/* Payment Type: 2×2 grid (Actual row / Pending row) */}
      <fieldset>
        <legend className="block text-xs text-black/60 dark:text-slate-400 mb-1">Payment Type</legend>
        <div className="space-y-1">
          <div className="flex rounded border border-black/20 dark:border-white/20 overflow-hidden" role="group" aria-label="Actual payment type">
            {(['paid', 'received'] as PaymentDirection[]).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => handleDirectionChange(dir)}
                disabled={saving || isSettling}
                aria-pressed={form.direction === dir}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                  form.direction === dir
                    ? 'bg-mustard text-black'
                    : 'bg-white dark:bg-slate-700 text-black/60 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {dir === 'paid' ? 'Paid' : 'Received'}
              </button>
            ))}
          </div>
          <div className="flex rounded border border-black/20 dark:border-white/20 overflow-hidden" role="group" aria-label="Pending payment type">
            {(['payable', 'receivable'] as PaymentDirection[]).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => handleDirectionChange(dir)}
                disabled={saving || isSettling}
                aria-pressed={form.direction === dir}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                  form.direction === dir
                    ? 'bg-mustard text-black'
                    : 'bg-white dark:bg-slate-700 text-black/60 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {dir === 'payable' ? 'Payable' : 'Receivable'}
              </button>
            ))}
          </div>
          <p className="text-xs text-black/40 dark:text-slate-500">
            {(form.direction === 'paid' || form.direction === 'received') ? 'Actual transaction' : 'Pending / expected'}
          </p>
        </div>
      </fieldset>

      {/* Sub Type */}
      <div>
        <label htmlFor={`pf-subtype-${uid}`} className="block text-xs text-black/60 dark:text-slate-400 mb-1">Sub Type</label>
        <select
          id={`pf-subtype-${uid}`}
          value={form.sub_type}
          onChange={(e) => onChange({ sub_type: e.target.value as PaymentSubType })}
          className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
          disabled={saving}
        >
          {subTypes.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div>
        <label htmlFor={`pf-amount-${uid}`} className="block text-xs text-black/60 dark:text-slate-400 mb-1">Amount (₹)</label>
        <input
          id={`pf-amount-${uid}`}
          type="number"
          min={0}
          step="0.01"
          value={form.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          placeholder="0.00"
          className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
          disabled={saving}
        />
      </div>

      {/* Vendor search (Paid and Payable) */}
      {(form.direction === 'paid' || form.direction === 'payable') && (
        <div>
          <p className="block text-xs text-black/60 dark:text-slate-400 mb-1">
            Vendor / Manufacturer <span className="text-black/30 dark:text-slate-500">(optional)</span>
          </p>
          <VendorSearch
            options={vendorOptions}
            selectedId={form.vendor_id_selected}
            selectedKind={form.vendor_kind}
            onSelect={(id, kind) => onChange({ vendor_id_selected: id, vendor_kind: kind })}
            onClear={() => onChange({ vendor_id_selected: '', vendor_kind: '' })}
            disabled={saving}
          />
        </div>
      )}

      {/* Comments */}
      <div>
        <label htmlFor={`pf-comments-${uid}`} className="block text-xs text-black/60 dark:text-slate-400 mb-1">Comments</label>
        <textarea
          id={`pf-comments-${uid}`}
          value={form.comments}
          onChange={(e) => onChange({ comments: e.target.value })}
          rows={2}
          className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard resize-none"
          disabled={saving}
          placeholder="Optional notes…"
        />
      </div>

      {/* Invoice upload */}
      <div>
        <label htmlFor={`pf-invoice-${uid}`} className="block text-xs text-black/60 dark:text-slate-400 mb-1">
          Invoice {existingInvoice && !isNew ? '(upload new to replace)' : '(optional)'}
        </label>
        {existingInvoice && !form.invoice_file && (
          <p className="text-xs text-mustard mb-1 truncate">Current: {existingInvoice}</p>
        )}
        <input
          id={`pf-invoice-${uid}`}
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => onChange({ invoice_file: e.target.files?.[0] ?? null })}
          className="w-full text-xs text-black/60 dark:text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-mustard/10 file:text-black dark:file:text-white"
          disabled={saving}
        />
        {form.invoice_file && (
          <p className="text-xs text-black/50 dark:text-slate-500 mt-0.5 truncate">{form.invoice_file.name}</p>
        )}
      </div>

      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onSave} disabled={saving} className="btn-primary flex-1 text-xs py-1.5">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-secondary flex-1 text-xs py-1.5">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  projectId: string
  projectClientName: string
  onClose: () => void
  onChanged: () => void
}

export function PaymentSidePanel({ projectId, projectClientName: _clientName, onClose, onChanged }: Props) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const [payments, setPayments] = useState<ProjectPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [vendorOptions, setVendorOptions] = useState<PaymentVendorOption[]>([])

  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [settlingId, setSettlingId] = useState<string | null>(null)
  const [form, setForm] = useState<PaymentFormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<Element | null>(null)

  const announce = (msg: string) => {
    setStatusMsg('')
    requestAnimationFrame(() => setStatusMsg(msg))
  }

  // Capture trigger, focus dialog, restore on unmount
  useEffect(() => {
    previousFocus.current = document.activeElement
    closeButtonRef.current?.focus()
    return () => { (previousFocus.current as HTMLElement)?.focus?.() }
  }, [])

  // Focus trap + Escape-to-close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab') {
        const el = dialogRef.current
        if (!el) return
        const focusable = el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const fetchPayments = () =>
    crmApi.listProjectPayments(projectId)
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : (r.data as any).results ?? []
        setPayments(data)
      })
      .finally(() => setLoading(false))

  useEffect(() => {
    fetchPayments()
    crmApi.allVendorsForPayment().then((r) => setVendorOptions(r.data))
  }, [projectId])

  const startAdd = () => {
    setForm(emptyForm())
    setFormError('')
    setEditingId('new')
  }

  const startEdit = (p: ProjectPayment) => {
    setForm(formFromPayment(p))
    setFormError('')
    setEditingId(p.id)
  }

  const cancelForm = () => {
    setEditingId(null)
    setSettlingId(null)
    setFormError('')
    addButtonRef.current?.focus()
  }

  const startSettle = (p: ProjectPayment) => {
    const settledDirection: PaymentDirection = p.direction === 'payable' ? 'paid' : 'received'
    setForm({
      payment_date: new Date().toISOString().slice(0, 10),
      direction: settledDirection,
      sub_type: p.sub_type,
      amount: p.amount,
      vendor_id_selected: p.vendor ?? p.manufacturer ?? '',
      vendor_kind: p.vendor ? 'vendor' : p.manufacturer ? 'manufacturer' : '',
      comments: p.comments,
      invoice_file: null,
    })
    setFormError('')
    setSettlingId(p.id)
    setEditingId('new')
  }

  const patchForm = (fields: Partial<PaymentFormState>) =>
    setForm((f) => ({ ...f, ...fields }))

  const buildFormData = () => {
    const fd = new FormData()
    fd.append('project', projectId)
    fd.append('payment_date', form.payment_date)
    fd.append('direction', form.direction)
    fd.append('sub_type', form.sub_type)
    fd.append('amount', form.amount || '0')
    fd.append('comments', form.comments)
    if ((form.direction === 'paid' || form.direction === 'payable') && form.vendor_id_selected) {
      if (form.vendor_kind === 'manufacturer') {
        fd.append('manufacturer', form.vendor_id_selected)
      } else {
        fd.append('vendor', form.vendor_id_selected)
      }
    }
    if (form.invoice_file) {
      fd.append('invoice', form.invoice_file)
    }
    return fd
  }

  const handleSave = async () => {
    if (!form.payment_date) { setFormError('Date is required.'); return }
    setSaving(true)
    setFormError('')
    try {
      if (settlingId) {
        await crmApi.settleProjectPayment(settlingId, buildFormData())
        setSettlingId(null)
      } else if (editingId === 'new') {
        await crmApi.createProjectPayment(buildFormData())
      } else {
        await crmApi.updateProjectPayment(editingId!, buildFormData())
      }
      setEditingId(null)
      await fetchPayments()
      onChanged()
      announce('Payment saved.')
      addButtonRef.current?.focus()
    } catch (err: any) {
      setFormError(err?.response?.data?.detail ?? 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      await crmApi.deleteProjectPayment(id)
      await fetchPayments()
      onChanged()
      announce('Payment deleted.')
      addButtonRef.current?.focus()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50" aria-hidden="true" onClick={onClose} />

      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-panel-title"
        className="fixed right-0 top-0 h-full z-50 w-full sm:w-[28rem] bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
      >
        <div className="sr-only" aria-live="polite" aria-atomic="true">{statusMsg}</div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
          <h2 id="payment-panel-title" className="font-semibold text-black dark:text-white">
            Payments
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-black/50 dark:text-slate-400 hover:text-black dark:hover:text-white text-xl leading-none rounded focus-visible:ring-2 focus-visible:ring-mustard"
            aria-label="Close payments panel"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {editingId === null && (
            <button ref={addButtonRef} type="button" onClick={startAdd} className="btn-primary w-full text-sm">
              + Add Payment
            </button>
          )}

          {editingId !== null && (
            <PaymentForm
              form={form}
              vendorOptions={vendorOptions}
              onChange={patchForm}
              onSave={handleSave}
              onCancel={cancelForm}
              saving={saving}
              error={formError}
              isNew={editingId === 'new'}
              isSettling={!!settlingId}
              fileInputRef={fileInputRef}
            />
          )}

          {loading ? (
            <p className="text-sm text-black/40 dark:text-slate-500">Loading…</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-black/40 dark:text-slate-500">No payments recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="border border-black/10 dark:border-white/10 rounded-lg p-3 text-sm space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${DIRECTION_BADGE[p.direction]}`}>
                          {p.direction.charAt(0).toUpperCase() + p.direction.slice(1)}
                        </span>
                        {p.is_settled && (
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            ✓ Settled
                          </span>
                        )}
                        <span className="font-medium text-black dark:text-white">{p.sub_type_display}</span>
                        <span className="text-xs text-black/40 dark:text-slate-500">
                          {new Date(p.payment_date).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      {(p.vendor_name || p.manufacturer_name) && (
                        <p className="text-xs text-black/50 dark:text-slate-400">
                          <span className="font-mono">[{p.vendor_vid ?? p.manufacturer_vid}]</span>{' '}
                          {p.vendor_name ?? p.manufacturer_name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!p.is_settled && (p.direction === 'payable' || p.direction === 'receivable') && editingId !== p.id && (
                        <button
                          type="button"
                          onClick={() => startSettle(p)}
                          aria-label={`Settle ${p.sub_type_display} ₹${fmt(p.amount)}`}
                          className="text-xs text-mustard hover:underline font-medium"
                        >
                          Settle →
                        </button>
                      )}
                      {!p.is_settled && editingId !== p.id && (p.direction === 'paid' || p.direction === 'received') && (
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          aria-label={`Edit ${p.sub_type_display} ₹${fmt(p.amount)}`}
                          className="text-xs text-mustard hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {!p.is_settled && editingId !== p.id && (p.direction === 'payable' || p.direction === 'receivable') && (
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          aria-label={`Edit ${p.sub_type_display} ₹${fmt(p.amount)}`}
                          className="text-xs text-black/40 dark:text-slate-500 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, `${p.sub_type_display} ₹${fmt(p.amount)}`)}
                          disabled={deletingId === p.id}
                          aria-label={`Delete ${p.sub_type_display} ₹${fmt(p.amount)}`}
                          className="text-xs text-red-500 hover:underline disabled:opacity-50"
                        >
                          {deletingId === p.id ? '…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className={`text-base font-semibold ${DIRECTION_AMOUNT[p.direction]}`}>
                    ₹{fmt(p.amount)}
                  </p>

                  {p.comments && (
                    <p className="text-xs text-black/60 dark:text-slate-400 line-clamp-2">{p.comments}</p>
                  )}

                  {p.invoice_filename && (
                    <a
                      href={p.invoice_drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-mustard hover:underline inline-flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {p.invoice_filename}
                    </a>
                  )}

                  {editingId === p.id && (
                    <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10">
                      <PaymentForm
                        form={form}
                        vendorOptions={vendorOptions}
                        onChange={patchForm}
                        onSave={handleSave}
                        onCancel={cancelForm}
                        saving={saving}
                        error={formError}
                        isNew={false}
                        isSettling={false}
                        fileInputRef={fileInputRef}
                        existingInvoice={p.invoice_filename}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
