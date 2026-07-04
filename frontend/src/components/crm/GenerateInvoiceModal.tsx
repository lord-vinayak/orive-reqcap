import { useEffect, useId, useRef, useState } from 'react'
import { crmApi } from '@/services/crm'
import type { Invoice, InvoiceType, InvoiceItem, InvoiceCreatePayload } from '@/types/crm'
import { INVOICE_TYPE_LABELS, INVOICE_TYPE_COLUMNS } from '@/types/crm'

interface Props {
  projectId: string
  projectNo: string
  clientName: string
  clientCompany: string
  onClose: () => void
  onDone: (invoice: Invoice) => void
}

type Step = 'template' | 'form' | 'generating' | 'done'

const INVOICE_TYPES: InvoiceType[] = ['service', 'product_batch', 'product_simple', 'service_size', 'printing', 'final']

const BLANK_ITEM = (): InvoiceItem => ({
  item_name: '', hsn: '', size_ml: 0,
  batch_no: 'NA', exp_date: 'NA', rate_per_item: 0, qty: 0,
})

// Which item fields each template uses
const TYPE_ITEM_FIELDS: Record<InvoiceType, (keyof InvoiceItem)[]> = {
  service:        ['item_name', 'hsn', 'rate_per_item', 'qty'],
  product_batch:  ['item_name', 'batch_no', 'exp_date', 'size_ml', 'hsn', 'rate_per_item', 'qty'],
  product_simple: ['item_name', 'rate_per_item', 'qty'],
  service_size:   ['item_name', 'size_ml', 'hsn', 'rate_per_item', 'qty'],
  printing:       ['item_name', 'size_ml', 'hsn', 'rate_per_item', 'qty'],
  final:          ['item_name', 'batch_no', 'exp_date', 'size_ml', 'hsn', 'rate_per_item', 'qty'],
}

const ITEM_FIELD_LABELS: Record<keyof InvoiceItem, string> = {
  item_name: 'Item', hsn: 'HSN', size_ml: 'Size (ml)',
  batch_no: 'Batch No', exp_date: 'Exp Date',
  rate_per_item: 'Rate/Item', qty: 'Qty',
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function GenerateInvoiceModal({
  projectId, projectNo, clientName, clientCompany, onClose, onDone,
}: Props) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<Element | null>(null)

  const [step, setStep] = useState<Step>('template')
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('service')
  const [error, setError] = useState('')
  const [result, setResult] = useState<Invoice | null>(null)

  // Header fields
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${projectNo}-${todayStr()}`)
  const [invoiceDate, setInvoiceDate] = useState(todayStr())
  const [clientNameField, setClientNameField] = useState(clientName)
  const [companyName, setCompanyName] = useState(clientCompany)
  const [clientGstin, setClientGstin] = useState('N/A')
  const [billingAddress, setBillingAddress] = useState('N/A')
  const [shippingAddress, setShippingAddress] = useState('N/A')
  const [ewayBillNo, setEwayBillNo] = useState('N/A')

  // GST
  const [sgst, setSgst] = useState('0')
  const [cgst, setCgst] = useState('0')
  const [igst, setIgst] = useState('0')

  // Type-specific
  const [shippingCost, setShippingCost] = useState('0')
  const [advanceRate, setAdvanceRate] = useState('0')
  const [dispatchAddress, setDispatchAddress] = useState('N/A')
  const [advanceReceived, setAdvanceReceived] = useState('0')

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>([BLANK_ITEM()])

  // Focus trap + Escape
  useEffect(() => {
    previousFocus.current = document.activeElement
    return () => { (previousFocus.current as HTMLElement)?.focus?.() }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const el = dialogRef.current
        if (!el || !el.contains(document.activeElement)) return
        const focusable = el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0], last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Item helpers
  const setItem = (idx: number, key: keyof InvoiceItem, val: string) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it))
  }
  const addItem = () => setItems((prev) => [...prev, BLANK_ITEM()])
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const handleGenerate = async () => {
    if (items.every((it) => !it.item_name)) {
      setError('Add at least one item with a name.'); return
    }
    setError('')
    setStep('generating')

    const payload: InvoiceCreatePayload = {
      project: projectId,
      invoice_type: invoiceType,
      invoice_number: invoiceNumber,
      date: invoiceDate,
      client_name: clientNameField,
      company_name: companyName,
      client_gstin: clientGstin,
      billing_address: billingAddress,
      shipping_address: shippingAddress,
      eway_bill_no: ewayBillNo,
      sgst_rate: sgst,
      cgst_rate: cgst,
      igst_rate: igst,
      shipping_cost: (invoiceType === 'product_simple' || invoiceType === 'final') ? shippingCost : 0,
      advance_rate: invoiceType === 'product_batch' ? advanceRate : 0,
      dispatch_address: invoiceType === 'final' ? dispatchAddress : '',
      advance_received: invoiceType === 'final' ? advanceReceived : 0,
      items: items.filter((it) => it.item_name),
    }

    try {
      const inv = await crmApi.createInvoice(payload)
      setResult(inv.data)
      setStep('done')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to generate invoice.')
      setStep('form')
    }
  }

  const activeFields = TYPE_ITEM_FIELDS[invoiceType]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
          <h2 id={titleId} className="text-lg font-semibold text-black dark:text-white">
            {step === 'template' && 'Select Invoice Type'}
            {step === 'form' && 'Invoice Details'}
            {step === 'generating' && 'Generating Invoice…'}
            {step === 'done' && 'Invoice Generated'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none px-1"
            aria-label="Close"
          >×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">

          {/* Step 1: Template picker */}
          {step === 'template' && (
            <div className="grid grid-cols-2 gap-3">
              {INVOICE_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setInvoiceType(t)}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    invoiceType === t
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-yellow-300'
                  }`}
                >
                  <p className="font-semibold text-sm text-black dark:text-white mb-1">
                    {INVOICE_TYPE_LABELS[t]}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {INVOICE_TYPE_COLUMNS[t].join(' · ')}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Form */}
          {step === 'form' && (
            <div className="space-y-5">
              {/* Header fields */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Invoice Header</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Invoice #" value={invoiceNumber} onChange={setInvoiceNumber} />
                  <Field label="Date" type="date" value={invoiceDate} onChange={setInvoiceDate} />
                  <Field label="Client Name" value={clientNameField} onChange={setClientNameField} />
                  <Field label="Company Name" value={companyName} onChange={setCompanyName} />
                  <Field label="GSTIN" value={clientGstin} onChange={setClientGstin} />
                  <Field label="Eway Bill No" value={ewayBillNo} onChange={setEwayBillNo} />
                  <Field label="Billing Address" value={billingAddress} onChange={setBillingAddress} />
                  <Field label="Shipping Address" value={shippingAddress} onChange={setShippingAddress} />
                  {invoiceType === 'final' && (
                    <Field label="Dispatch Address" value={dispatchAddress} onChange={setDispatchAddress} />
                  )}
                </div>
              </div>

              {/* GST */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">GST Rates (%)</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="SGST %" value={sgst} onChange={setSgst} type="number" />
                  <Field label="CGST %" value={cgst} onChange={setCgst} type="number" />
                  <Field label="IGST %" value={igst} onChange={setIgst} type="number" />
                </div>
              </div>

              {/* Type-specific extras */}
              {invoiceType === 'product_simple' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Extras</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Shipping Cost (₹)" value={shippingCost} onChange={setShippingCost} type="number" />
                  </div>
                </div>
              )}
              {invoiceType === 'product_batch' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Extras</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Advance to be paid (%)" value={advanceRate} onChange={setAdvanceRate} type="number" />
                  </div>
                </div>
              )}
              {invoiceType === 'final' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Extras</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Shipping Cost (₹)" value={shippingCost} onChange={setShippingCost} type="number" />
                    <Field label="Advance Received (₹)" value={advanceReceived} onChange={setAdvanceReceived} type="number" />
                  </div>
                </div>
              )}

              {/* Line items */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Line Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-200 dark:border-slate-600 rounded">
                    <thead>
                      <tr className="bg-yellow-50 dark:bg-yellow-900/20">
                        {activeFields.map((f) => (
                          <th key={f} className="px-2 py-1 text-left font-semibold text-yellow-700 dark:text-yellow-400 border-b border-gray-200 dark:border-slate-600 whitespace-nowrap">
                            {ITEM_FIELD_LABELS[f]}
                          </th>
                        ))}
                        <th className="px-2 py-1 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 dark:border-slate-700 last:border-0">
                          {activeFields.map((f) => (
                            <td key={f} className="px-1 py-1">
                              <input
                                className="w-full border border-gray-200 dark:border-slate-600 rounded px-1.5 py-1 text-xs bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 min-w-[60px]"
                                value={String(item[f] ?? '')}
                                onChange={(e) => setItem(idx, f, e.target.value)}
                                type={['rate_per_item', 'qty', 'size_ml'].includes(f) ? 'number' : 'text'}
                                min={0}
                              />
                            </td>
                          ))}
                          <td className="px-1 py-1 text-center">
                            {items.length > 1 && (
                              <button
                                onClick={() => removeItem(idx)}
                                className="text-red-400 hover:text-red-600 text-sm leading-none"
                                aria-label="Remove row"
                              >×</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={addItem}
                  className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 hover:underline"
                >+ Add row</button>
              </div>

              {error && (
                <p className="text-red-500 text-sm" role="alert">{error}</p>
              )}
            </div>
          )}

          {/* Step 3a: Generating */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Generating PDF and uploading to Drive…</p>
            </div>
          )}

          {/* Step 3b: Done */}
          {step === 'done' && result && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-2xl">✓</div>
              <p className="font-semibold text-black dark:text-white">{result.invoice_number}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{result.invoice_type_label}</p>
              {result.drive_url && (
                <a
                  href={result.drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-yellow-500 text-white text-sm font-semibold hover:bg-yellow-600 transition-colors"
                >
                  Open PDF ↗
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-black/10 dark:border-white/10 shrink-0">
          {step === 'template' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-black dark:text-white">
                Cancel
              </button>
              <button
                onClick={() => {
                  setItems([BLANK_ITEM()])
                  setStep('form')
                }}
                className="px-4 py-2 text-sm rounded-lg bg-yellow-500 text-white font-semibold hover:bg-yellow-600"
              >
                Next →
              </button>
            </>
          )}
          {step === 'form' && (
            <>
              <button onClick={() => { setError(''); setStep('template') }} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-black dark:text-white">
                ← Back
              </button>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 text-sm rounded-lg bg-yellow-500 text-white font-semibold hover:bg-yellow-600"
              >
                Generate Invoice
              </button>
            </>
          )}
          {step === 'done' && (
            <button
              onClick={() => { onDone(result!); onClose() }}
              className="px-4 py-2 text-sm rounded-lg bg-yellow-500 text-white font-semibold hover:bg-yellow-600"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
      />
    </div>
  )
}
