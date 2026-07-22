import { useEffect, useId, useRef, useState } from 'react'
import { crmApi } from '@/services/crm'
import { clientService, proposalService, requirementService } from '@/services'
import type { Proposal, Requirement } from '@/types'
import type { BillingInfo, BillingInfoPayload, BillingInfoProduct, ServiceKey } from '@/types/crm'
import { SERVICE_KEYS, SERVICE_LABELS } from '@/types/crm'

interface Props {
  projectId: string
  clientPhone: string
  requirementId: string | null
  existing: BillingInfo | null
  onClose: () => void
  onSaved: (info: BillingInfo) => void
}

function itemName(catalogData: Record<string, unknown>): string {
  const parts = [catalogData.product_type, catalogData.sub_product_type]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
  return parts.length ? parts.join(' — ') : (typeof catalogData.body_part === 'string' ? catalogData.body_part : 'Product')
}

function defaultUnitCost(catalogData: Record<string, unknown>): number | string {
  const total = catalogData.total_cost
  if (typeof total === 'number') return total
  const mrp = catalogData.potential_mrp
  if (typeof mrp === 'number') return mrp
  return ''
}

export function BillingInfoModal({ projectId, clientPhone, requirementId, existing, onClose, onSaved }: Props) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<Element | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [clientName, setClientName] = useState(existing?.client_name ?? '')
  const [companyName, setCompanyName] = useState(existing?.company_name ?? '')
  const [gstin, setGstin] = useState(existing?.client_gstin ?? '')
  const [billingAddress, setBillingAddress] = useState(existing?.billing_address ?? '')
  const [phoneNo, setPhoneNo] = useState(existing?.phone_no ?? clientPhone)
  const [email, setEmail] = useState(existing?.email ?? '')
  const [shippingAddress, setShippingAddress] = useState(existing?.shipping_address ?? '')
  const [dispatchFromName, setDispatchFromName] = useState(existing?.dispatch_from_name ?? '')
  const [dispatchFromGstin, setDispatchFromGstin] = useState(existing?.dispatch_from_gstin ?? '')
  const [dispatchFromAddress, setDispatchFromAddress] = useState(existing?.dispatch_from_address ?? '')

  const [servicePrices, setServicePrices] = useState<Record<ServiceKey, string>>(
    () => Object.fromEntries(SERVICE_KEYS.map((k) => [k, ''])) as Record<ServiceKey, string>
  )
  const [selectedServices, setSelectedServices] = useState<Set<ServiceKey>>(
    () => new Set((existing?.services ?? []).map((s) => s.key))
  )

  const [products, setProducts] = useState<BillingInfoProduct[]>(existing?.products ?? [])
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [selectedRequirementId, setSelectedRequirementId] = useState(requirementId ?? '')
  const [loadingRequirements, setLoadingRequirements] = useState(true)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [loadingProposals, setLoadingProposals] = useState(false)

  // Prefill from Client master on first open for a brand-new record
  useEffect(() => {
    if (existing) return
    clientService.get(clientPhone).then((c) => {
      setClientName((v) => v || c.name)
      setCompanyName((v) => v || c.company_name)
      setGstin((v) => v || c.gst_details)
      setBillingAddress((v) => v || c.physical_address)
      setEmail((v) => v || c.email)
    }).catch(() => {})
  }, [clientPhone, existing])

  // Base rates prefill
  useEffect(() => {
    crmApi.getServiceRates().then(({ data }) => {
      setServicePrices((prev) => {
        const next = { ...prev }
        for (const k of SERVICE_KEYS) {
          if (!next[k] && data[k] != null) next[k] = String(data[k])
        }
        return next
      })
    }).catch(() => {})
    if (existing) {
      const fromExisting = Object.fromEntries(
        existing.services.map((s) => [s.key, String(s.price)])
      ) as Partial<Record<ServiceKey, string>>
      setServicePrices((prev) => ({ ...prev, ...fromExisting }))
    }
  }, [existing])

  // Requirements for this client — project.source_requirement is only set when a
  // project was created via the "convert requirement" deep link, so most projects
  // don't have it even though the client has saved requirements. Look up by client
  // phone instead, and use the prop only as the preferred default selection.
  useEffect(() => {
    setLoadingRequirements(true)
    requirementService.listForClient(clientPhone)
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results ?? []
        setRequirements(list)
        if (list.length) {
          const preferred = requirementId && list.some((r) => r.id === requirementId) ? requirementId : list[0].id
          setSelectedRequirementId(preferred)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRequirements(false))
  }, [clientPhone, requirementId])

  // Proposals (Client Costings) for the selected requirement
  useEffect(() => {
    if (!selectedRequirementId) { setProposals([]); return }
    setLoadingProposals(true)
    proposalService.listForRequirement(selectedRequirementId)
      .then((list) => {
        setProposals(list)
        setSelectedProposalId(list.length ? list[0].id : '')
      })
      .catch(() => {})
      .finally(() => setLoadingProposals(false))
  }, [selectedRequirementId])

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

  const toggleService = (key: ServiceKey) => {
    setSelectedServices((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleProduct = (proposalItemId: string, name: string, unitCost: number | string) => {
    setProducts((prev) => {
      if (prev.some((p) => p.proposal_item_id === proposalItemId)) {
        return prev.filter((p) => p.proposal_item_id !== proposalItemId)
      }
      return [...prev, { proposal_item_id: proposalItemId, item_name: name, per_unit_cost: unitCost }]
    })
  }

  const updateProductCost = (proposalItemId: string, cost: string) => {
    setProducts((prev) => prev.map((p) => p.proposal_item_id === proposalItemId ? { ...p, per_unit_cost: cost } : p))
  }

  const selectedProposal = proposals.find((p) => p.id === selectedProposalId)

  const handleSave = async () => {
    if (!clientName.trim()) { setError('Client name is required.'); return }
    setError('')
    setSaving(true)
    const payload: BillingInfoPayload = {
      project: projectId,
      client_name: clientName,
      company_name: companyName,
      client_gstin: gstin,
      billing_address: billingAddress,
      phone_no: phoneNo,
      email,
      shipping_address: shippingAddress,
      dispatch_from_name: dispatchFromName,
      dispatch_from_gstin: dispatchFromGstin,
      dispatch_from_address: dispatchFromAddress,
      services: SERVICE_KEYS.filter((k) => selectedServices.has(k)).map((k) => ({
        key: k, label: SERVICE_LABELS[k], price: servicePrices[k] || 0,
      })),
      products,
    }
    try {
      const res = existing
        ? await crmApi.updateBillingInfo(existing.id, payload)
        : await crmApi.createBillingInfo(payload)
      onSaved(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to save billing info.')
    } finally {
      setSaving(false)
    }
  }

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
          <h2 id={titleId} className="text-lg font-semibold text-black dark:text-white">
            {existing ? 'Edit Billing Info' : 'Billing Info'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none px-1"
            aria-label="Close"
          >×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Client Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client Name" value={clientName} onChange={setClientName} required />
              <Field label="Company Name" value={companyName} onChange={setCompanyName} />
              <Field label="GST No" value={gstin} onChange={setGstin} />
              <Field label="Phone No" value={phoneNo} onChange={setPhoneNo} />
              <Field label="Email" value={email} onChange={setEmail} type="email" />
              <Field label="Billing Address (as per GST)" value={billingAddress} onChange={setBillingAddress} />
              <Field label="Shipping Address (for dispatches)" value={shippingAddress} onChange={setShippingAddress} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Dispatch From (Final invoice)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Where the goods actually ship from — e.g. a manufacturer's facility, if different from us.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dispatch From — Name" value={dispatchFromName} onChange={setDispatchFromName} />
              <Field label="Dispatch From — GSTIN" value={dispatchFromGstin} onChange={setDispatchFromGstin} />
              <Field label="Dispatch From — Address" value={dispatchFromAddress} onChange={setDispatchFromAddress} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Services Taken</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Only selected services will be billed.</p>
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-2 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2">
                  <input
                    id={`svc-${key}`}
                    type="checkbox"
                    checked={selectedServices.has(key)}
                    onChange={() => toggleService(key)}
                    className="h-4 w-4 accent-yellow-500"
                  />
                  <label htmlFor={`svc-${key}`} className="text-sm text-black dark:text-white flex-1">
                    {SERVICE_LABELS[key]}
                  </label>
                  {selectedServices.has(key) && (
                    <input
                      type="number"
                      value={servicePrices[key]}
                      onChange={(e) => setServicePrices((p) => ({ ...p, [key]: e.target.value }))}
                      aria-label={`${SERVICE_LABELS[key]} price`}
                      className="w-24 border border-gray-200 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 text-black dark:text-white"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Products (from Client Costing)</h3>
            {loadingRequirements ? (
              <p className="text-xs text-gray-400">Loading requirements…</p>
            ) : requirements.length === 0 ? (
              <p className="text-xs text-gray-400">This client has no saved requirements — no Client Costing to pull products from.</p>
            ) : (
              <>
                {requirements.length > 1 && (
                  <select
                    value={selectedRequirementId}
                    onChange={(e) => setSelectedRequirementId(e.target.value)}
                    aria-label="Select requirement"
                    className="w-full mb-2 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white"
                  >
                    {requirements.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title || 'Untitled requirement'} — {new Date(r.created_at).toLocaleDateString('en-IN')}
                      </option>
                    ))}
                  </select>
                )}
                {loadingProposals ? (
                  <p className="text-xs text-gray-400">Loading Client Costings…</p>
                ) : proposals.length === 0 ? (
                  <p className="text-xs text-gray-400">No Client Costing found for this requirement.</p>
                ) : (
                  <select
                    value={selectedProposalId}
                    onChange={(e) => setSelectedProposalId(e.target.value)}
                    aria-label="Select Client Costing"
                    className="w-full mb-2 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white"
                  >
                    {proposals.map((p, idx) => (
                      <option key={p.id} value={p.id}>
                        Client Costing #{proposals.length - idx} — {new Date(p.created_at).toLocaleDateString('en-IN')} ({p.items.length} items)
                      </option>
                    ))}
                  </select>
                )}
                {proposals.length > 0 && (
                  <div className="border border-gray-200 dark:border-slate-600 rounded-lg divide-y divide-gray-100 dark:divide-slate-700 max-h-48 overflow-y-auto">
                    {(selectedProposal?.items ?? []).map((it) => {
                      const name = itemName(it.catalog_data as unknown as Record<string, unknown>)
                      const cost = defaultUnitCost(it.catalog_data as unknown as Record<string, unknown>)
                      const checked = products.some((p) => p.proposal_item_id === it.id)
                      return (
                        <label key={it.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProduct(it.id, name, cost)}
                            className="h-4 w-4 accent-yellow-500"
                          />
                          <span className="flex-1 text-black dark:text-white">{name}</span>
                        </label>
                      )
                    })}
                    {selectedProposal?.items.length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-400">No items in this Client Costing.</p>
                    )}
                  </div>
                )}
              </>
            )}

            {products.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Selected products — per-unit cost (editable)</p>
                <div className="space-y-1">
                  {products.map((p) => (
                    <div key={p.proposal_item_id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 text-black dark:text-white">{p.item_name}</span>
                      <input
                        type="number"
                        value={p.per_unit_cost}
                        onChange={(e) => updateProductCost(p.proposal_item_id, e.target.value)}
                        aria-label={`${p.item_name} per unit cost`}
                        className="w-28 border border-gray-200 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 text-black dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-black/10 dark:border-white/10 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-black dark:text-white">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-yellow-500 text-white font-semibold hover:bg-yellow-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', required = false,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">
        {label}{required && <span className="text-red-500" aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-required={required || undefined}
        className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
      />
    </div>
  )
}
