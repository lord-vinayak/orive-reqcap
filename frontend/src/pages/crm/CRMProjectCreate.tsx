import { useEffect, useState, useId } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { crmApi } from '@/services/crm'
import { clientService, userService } from '@/services'
import type { Client, User } from '@/types'
import type { DropdownOption } from '@/types/crm'

interface FormState {
  client: string
  no_of_products: string
  moq: string
  manufacturer: string
  sales_poc: string
  formulation_poc: string
  sample_booked_date: string
}

export default function CRMProjectCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefilledClient = searchParams.get('client') ?? ''

  // IDs for accessibility
  const clientId = useId()
  const clientSearchId = useId()
  const productsId = useId()
  const moqId = useId()
  const manufacturerId = useId()

  const salesPocId = useId()
  const formPocId = useId()
  const sampleDateId = useId()

  const [form, setForm] = useState<FormState>({
    client: prefilledClient,
    no_of_products: '',
    moq: '',
    manufacturer: '',
    sales_poc: '',
    formulation_poc: '',
    sample_booked_date: '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Reference data
  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [clientLoading, setClientLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [manufacturers, setManufacturers] = useState<DropdownOption[]>([])
  const [salesUsers, setSalesUsers] = useState<User[]>([])
  const [formulationUsers, setFormulationUsers] = useState<User[]>([])

  // Load dropdowns on mount
  useEffect(() => {
    crmApi.manufacturerDropdown().then((r) => setManufacturers(r.data))
    userService.list().then((data) => {
      const users = Array.isArray(data) ? data : (data as any).results ?? []
      setSalesUsers(users.filter((u: User) => u.role === 'poc_sales' && u.is_active))
      setFormulationUsers(users.filter((u: User) => u.role === 'poc_formulation' && u.is_active))
    })
  }, [])

  // Prefill client if passed from query param
  useEffect(() => {
    if (prefilledClient) {
      clientService.get(prefilledClient)
        .then((c) => { setSelectedClient(c); setClientSearch(c.name) })
        .catch(() => {})
    }
  }, [prefilledClient])

  const searchClients = (q: string) => {
    setClientSearch(q)
    setSelectedClient(null)
    setForm((f) => ({ ...f, client: '' }))
    if (!q.trim()) { setClients([]); return }
    setClientLoading(true)
    clientService.list({ q })
      .then((data) => {
        const arr = Array.isArray(data) ? data : (data as any).results ?? []
        setClients(arr)
      })
      .finally(() => setClientLoading(false))
  }

  const selectClient = (c: Client) => {
    setSelectedClient(c)
    setForm((f) => ({ ...f, client: c.phone_no }))
    setClientSearch(c.name)
    setClients([])
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.client) e.client = 'Please select a client.'
    if (form.no_of_products && Number(form.no_of_products) < 1)
      e.no_of_products = 'Must be at least 1.'
    if (form.moq && Number(form.moq) < 1)
      e.moq = 'Must be at least 1.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const payload: Record<string, string | number | undefined> = {
        client: form.client,
      }
      if (form.no_of_products) payload.no_of_products = Number(form.no_of_products)
      if (form.moq) payload.moq = Number(form.moq)
      if (form.manufacturer) (payload as any).manufacturers = [form.manufacturer]
      if (form.sales_poc) payload.sales_poc = form.sales_poc
      if (form.formulation_poc) payload.formulation_poc = form.formulation_poc
      if (form.sample_booked_date) payload.sample_booked_date = form.sample_booked_date

      const res = await crmApi.createProject(payload as any)
      navigate(`/crm/projects/${res.data.id}`)
    } catch (err: any) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' · ')
        setSubmitError(msgs)
      } else {
        setSubmitError('Failed to create project. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  return (
    <Layout title="New Project">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-black dark:text-white mb-6">Create New Project</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-6" aria-label="New CRM project form">

          {/* ── Client selector ── */}
          <fieldset className="space-y-1">
            <legend className="text-sm font-semibold text-black dark:text-white mb-2">
              Client <span className="text-red-500" aria-hidden="true">*</span>
            </legend>

            {selectedClient ? (
              /* Confirmed selection */
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                <div className="flex-1">
                  <div className="font-medium text-black dark:text-white text-sm">{selectedClient.name}</div>
                  <div className="text-xs text-black/50 dark:text-slate-500">
                    {selectedClient.company_name && `${selectedClient.company_name} · `}{selectedClient.phone_no}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedClient(null); setForm((f) => ({ ...f, client: '' })); setClientSearch('') }}
                  className="text-xs text-black/50 hover:text-black dark:hover:text-white underline focus-visible:ring-2 focus-visible:ring-mustard rounded"
                  aria-label="Change selected client"
                >
                  Change
                </button>
              </div>
            ) : (
              /* Search input */
              <div className="relative">
                <label htmlFor={clientSearchId} className="sr-only">Search for a client by name or phone</label>
                <input
                  id={clientSearchId}
                  type="search"
                  value={clientSearch}
                  onChange={(e) => searchClients(e.target.value)}
                  placeholder="Search by name or phone number…"
                  className={`w-full border rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard ${errors.client ? 'border-red-400' : 'border-black/20 dark:border-white/20'}`}
                  aria-invalid={!!errors.client}
                  aria-describedby={errors.client ? `${clientId}-error` : undefined}
                  autoComplete="off"
                />
                {clientLoading && (
                  <div className="absolute right-3 top-2.5 text-xs text-black/40 dark:text-slate-500" aria-live="polite">
                    Searching…
                  </div>
                )}
                {clients.length > 0 && (
                  <ul
                    role="listbox"
                    aria-label="Client search results"
                    className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded shadow-lg max-h-48 overflow-y-auto"
                  >
                    {clients.map((c) => (
                      <li key={c.phone_no} role="option" aria-selected={false}>
                        <button
                          type="button"
                          onClick={() => selectClient(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-mustard/10 focus:bg-mustard/10 focus:outline-none"
                          aria-label={`Select client ${c.name}, phone ${c.phone_no}`}
                        >
                          <span className="font-medium text-black dark:text-white">{c.name}</span>
                          {c.company_name && <span className="text-black/50 dark:text-slate-500 ml-2">{c.company_name}</span>}
                          <span className="text-black/40 dark:text-slate-500 text-xs block">{c.phone_no}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {errors.client && (
              <p id={`${clientId}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">
                {errors.client}
              </p>
            )}
          </fieldset>

          {/* ── Products & MOQ ── */}
          <div className="grid grid-cols-2 gap-4">
            <Field
              id={productsId}
              label="No. of Products"
              error={errors.no_of_products}
            >
              <input
                id={productsId}
                type="number"
                min={1}
                value={form.no_of_products}
                onChange={set('no_of_products')}
                placeholder="e.g. 5"
                className={inputClass(!!errors.no_of_products)}
                aria-invalid={!!errors.no_of_products}
                aria-describedby={errors.no_of_products ? `${productsId}-error` : undefined}
              />
            </Field>

            <Field
              id={moqId}
              label="MOQ"
              hint="Minimum Order Quantity"
              error={errors.moq}
            >
              <input
                id={moqId}
                type="number"
                min={1}
                value={form.moq}
                onChange={set('moq')}
                placeholder="e.g. 1000"
                className={inputClass(!!errors.moq)}
                aria-invalid={!!errors.moq}
                aria-describedby={errors.moq ? `${moqId}-error` : `${moqId}-hint`}
              />
            </Field>
          </div>

          {/* ── Manufacturer ── */}
          <Field id={manufacturerId} label="Manufacturer">
            <select
              id={manufacturerId}
              value={form.manufacturer}
              onChange={set('manufacturer')}
              className={inputClass(false)}
              aria-label="Select manufacturer (optional)"
            >
              <option value="">— Select manufacturer (optional) —</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.company_name}{m.city ? ` (${m.city})` : ''}
                </option>
              ))}
            </select>
            {manufacturers.length === 0 && (
              <p className="text-xs text-black/40 dark:text-slate-500 mt-1">
                No manufacturers in Master Data yet.
              </p>
            )}
          </Field>

          {/* ── POC Dropdowns ── */}
          <div className="grid grid-cols-2 gap-4">
            <Field id={salesPocId} label="Sales POC">
              <select
                id={salesPocId}
                value={form.sales_poc}
                onChange={set('sales_poc')}
                className={inputClass(false)}
                aria-label="Select Sales Point of Contact (optional)"
              >
                <option value="">— None —</option>
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              {salesUsers.length === 0 && (
                <p className="text-xs text-black/40 dark:text-slate-500 mt-1">No Sales POC users found.</p>
              )}
            </Field>

            <Field id={formPocId} label="Formulation POC">
              <select
                id={formPocId}
                value={form.formulation_poc}
                onChange={set('formulation_poc')}
                className={inputClass(false)}
                aria-label="Select Formulation Point of Contact (optional)"
              >
                <option value="">— None —</option>
                {formulationUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              {formulationUsers.length === 0 && (
                <p className="text-xs text-black/40 dark:text-slate-500 mt-1">No Formulation POC users found.</p>
              )}
            </Field>
          </div>

          {/* ── Sample Booked Date ── */}
          <Field
            id={sampleDateId}
            label="Sample Booked Date (Day 0)"
            hint="Sets the timeline baseline. Can be added later."
          >
            <input
              id={sampleDateId}
              type="date"
              value={form.sample_booked_date}
              onChange={set('sample_booked_date')}
              className={inputClass(false)}
              aria-describedby={`${sampleDateId}-hint`}
            />
          </Field>

          {/* ── Submit error ── */}
          {submitError && (
            <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
              {submitError}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? 'Creating…' : 'Create Project'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function inputClass(hasError: boolean) {
  return `w-full border rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard ${
    hasError ? 'border-red-400' : 'border-black/20 dark:border-white/20'
  }`
}

function Field({
  id, label, required, hint, error, children,
}: {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-black dark:text-white mb-1">
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-black/40 dark:text-slate-500 mt-1">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
}
