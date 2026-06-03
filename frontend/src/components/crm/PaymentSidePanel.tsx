import { useEffect, useRef, useState } from 'react'
import { crmApi } from '@/services/crm'
import type { ProjectPayment, PaymentType } from '@/types/crm'
import { useAuthStore } from '@/store/authStore'

const PAYMENT_TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: 'sample', label: 'Sample' },
  { value: 'advance', label: 'Advance' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'printing', label: 'Printing' },
  { value: 'derma_testing', label: 'Derma Testing' },
  { value: 'other_service', label: 'Other Service' },
  { value: 'shipment_printing', label: 'Shipment - Printing' },
  { value: 'shipment_packaging', label: 'Shipment - Packaging' },
  { value: 'shipment_testing', label: 'Shipment - Testing' },
]

const fmt = (val: string | number) =>
  Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface PaymentFormState {
  payment_date: string
  payment_type: PaymentType
  amount_paid: string
  amount_received: string
  comments: string
  invoice_file: File | null
}

const emptyForm = (): PaymentFormState => ({
  payment_date: new Date().toISOString().slice(0, 10),
  payment_type: 'advance',
  amount_paid: '',
  amount_received: '',
  comments: '',
  invoice_file: null,
})

function formFromPayment(p: ProjectPayment): PaymentFormState {
  return {
    payment_date: p.payment_date,
    payment_type: p.payment_type,
    amount_paid: p.amount_paid,
    amount_received: p.amount_received,
    comments: p.comments,
    invoice_file: null,
  }
}

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

  // Which payment is being edited (null = showing add form for new entry)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<PaymentFormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchPayments = () =>
    crmApi.listProjectPayments(projectId)
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : (r.data as any).results ?? []
        setPayments(data)
      })
      .finally(() => setLoading(false))

  useEffect(() => { fetchPayments() }, [projectId])

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
    setFormError('')
  }

  const patchForm = (fields: Partial<PaymentFormState>) =>
    setForm((f) => ({ ...f, ...fields }))

  const buildFormData = () => {
    const fd = new FormData()
    fd.append('project', projectId)
    fd.append('payment_date', form.payment_date)
    fd.append('payment_type', form.payment_type)
    fd.append('amount_paid', form.amount_paid || '0')
    fd.append('amount_received', form.amount_received || '0')
    fd.append('comments', form.comments)
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
      if (editingId === 'new') {
        await crmApi.createProjectPayment(buildFormData())
      } else {
        await crmApi.updateProjectPayment(editingId!, buildFormData())
      }
      setEditingId(null)
      await fetchPayments()
      onChanged()
    } catch {
      setFormError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this payment entry?')) return
    setDeletingId(id)
    try {
      await crmApi.deleteProjectPayment(id)
      await fetchPayments()
      onChanged()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50" aria-hidden="true" onClick={onClose} />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-panel-title"
        className="fixed right-0 top-0 h-full z-50 w-[26rem] bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
          <h2 id="payment-panel-title" className="font-semibold text-black dark:text-white">
            Payments
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-black/50 dark:text-slate-400 hover:text-black dark:hover:text-white text-xl leading-none rounded focus-visible:ring-2 focus-visible:ring-mustard"
            aria-label="Close payments panel"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Add button */}
          {editingId === null && (
            <button
              type="button"
              onClick={startAdd}
              className="btn-primary w-full text-sm"
            >
              + Add Payment
            </button>
          )}

          {/* Add / Edit form */}
          {editingId !== null && (
            <PaymentForm
              form={form}
              onChange={patchForm}
              onSave={handleSave}
              onCancel={cancelForm}
              saving={saving}
              error={formError}
              isNew={editingId === 'new'}
              fileInputRef={fileInputRef}
            />
          )}

          {/* Existing entries */}
          {loading ? (
            <p className="text-sm text-black/40 dark:text-slate-500">Loading…</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-black/40 dark:text-slate-500">No payments recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="border border-black/10 dark:border-white/10 rounded-lg p-3 text-sm space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-medium text-black dark:text-white">{p.payment_type_display}</span>
                      <span className="ml-2 text-xs text-black/40 dark:text-slate-500">
                        {new Date(p.payment_date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {editingId !== p.id && (
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="text-xs text-mustard hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="text-xs text-red-500 hover:underline disabled:opacity-50"
                        >
                          {deletingId === p.id ? '…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs">
                    <span className="text-red-600 dark:text-red-400">
                      Paid: ₹{fmt(p.amount_paid)}
                    </span>
                    <span className="text-green-600 dark:text-green-400">
                      Received: ₹{fmt(p.amount_received)}
                    </span>
                  </div>

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
                        onChange={patchForm}
                        onSave={handleSave}
                        onCancel={cancelForm}
                        saving={saving}
                        error={formError}
                        isNew={false}
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

// ── Inline form ───────────────────────────────────────────────────────────────

interface PaymentFormProps {
  form: PaymentFormState
  onChange: (fields: Partial<PaymentFormState>) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  error: string
  isNew: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  existingInvoice?: string
}

function PaymentForm({ form, onChange, onSave, onCancel, saving, error, isNew, fileInputRef, existingInvoice }: PaymentFormProps) {
  return (
    <div className="bg-black/3 dark:bg-white/3 rounded-lg p-4 space-y-3 text-sm">
      <p className="font-medium text-black dark:text-white text-xs uppercase tracking-wide">
        {isNew ? 'New Payment Entry' : 'Edit Entry'}
      </p>

      {/* Date */}
      <div>
        <label className="block text-xs text-black/60 dark:text-slate-400 mb-1">Date *</label>
        <input
          type="date"
          value={form.payment_date}
          onChange={(e) => onChange({ payment_date: e.target.value })}
          className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
          disabled={saving}
        />
      </div>

      {/* Payment type */}
      <div>
        <label className="block text-xs text-black/60 dark:text-slate-400 mb-1">Payment Type</label>
        <select
          value={form.payment_type}
          onChange={(e) => onChange({ payment_type: e.target.value as PaymentType })}
          className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
          disabled={saving}
        >
          {PAYMENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-black/60 dark:text-slate-400 mb-1">Amount Paid (₹)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.amount_paid}
            onChange={(e) => onChange({ amount_paid: e.target.value })}
            placeholder="0.00"
            className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
            disabled={saving}
          />
        </div>
        <div>
          <label className="block text-xs text-black/60 dark:text-slate-400 mb-1">Amount Received (₹)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.amount_received}
            onChange={(e) => onChange({ amount_received: e.target.value })}
            placeholder="0.00"
            className="w-full border border-black/20 dark:border-white/20 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
            disabled={saving}
          />
        </div>
      </div>

      {/* Comments */}
      <div>
        <label className="block text-xs text-black/60 dark:text-slate-400 mb-1">Comments</label>
        <textarea
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
        <label className="block text-xs text-black/60 dark:text-slate-400 mb-1">
          Invoice {existingInvoice && !isNew ? '(upload new to replace)' : '(optional)'}
        </label>
        {existingInvoice && !form.invoice_file && (
          <p className="text-xs text-mustard mb-1 truncate">Current: {existingInvoice}</p>
        )}
        <input
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
