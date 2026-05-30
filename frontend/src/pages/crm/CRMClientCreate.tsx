import { useEffect, useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import { clientService, userService } from '@/services'
import type { User } from '@/types'

interface FormState {
  phone_no: string
  name: string
  company_name: string
  email: string
  city: string
  gst_details: string
  physical_address: string
  poc: string
  status: 'new_lead' | 'interested_started' | 'not_interested_closed'
}

export default function CRMClientCreate() {
  const navigate = useNavigate()

  // IDs for accessibility
  const phoneId = useId()
  const nameId = useId()
  const companyId = useId()
  const emailId = useId()
  const cityId = useId()
  const gstId = useId()
  const addressId = useId()
  const pocId = useId()
  const statusId = useId()

  const [form, setForm] = useState<FormState>({
    phone_no: '',
    name: '',
    company_name: '',
    email: '',
    city: '',
    gst_details: '',
    physical_address: '',
    poc: '',
    status: 'new_lead',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [users, setUsers] = useState<User[]>([])

  // Load team members on mount
  useEffect(() => {
    userService.list()
      .then((data) => {
        const arr = Array.isArray(data) ? data : (data as any).results ?? []
        setUsers(arr.filter((u: User) => u.is_active))
      })
      .catch(() => {})
  }, [])

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {}
    
    if (!form.name.trim()) {
      e.name = 'Client Name is required.'
    }
    
    const phoneTrimmed = form.phone_no.trim()
    if (!phoneTrimmed) {
      e.phone_no = 'Phone number is required.'
    } else if (!/^\d{10}$/.test(phoneTrimmed)) {
      e.phone_no = 'Phone number must be exactly 10 digits.'
    }

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Please enter a valid email address.'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError('')
    
    try {
      const payload: Record<string, any> = {
        phone_no: form.phone_no.trim(),
        name: form.name.trim(),
        company_name: form.company_name.trim(),
        email: form.email.trim(),
        city: form.city.trim(),
        gst_details: form.gst_details.trim(),
        physical_address: form.physical_address.trim(),
        status: form.status,
        poc: form.poc || null,
      }

      await clientService.create(payload)
      navigate(`/crm/clients/${payload.phone_no}`)
    } catch (err: any) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' · ')
        setSubmitError(msgs)
      } else {
        setSubmitError('Failed to create client. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  return (
    <Layout title="New Client">
      <div className="max-w-2xl mx-auto py-4">
        <h1 className="text-2xl font-bold text-black dark:text-white mb-6">Create New Client</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg border border-black/10 dark:border-white/10" aria-label="New client creation form">
          
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Client Name */}
            <div className="space-y-1">
              <label htmlFor={nameId} className="text-sm font-semibold text-black dark:text-white">
                Client Name <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id={nameId}
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. John Doe"
                className={`w-full border rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard ${errors.name ? 'border-red-400' : 'border-black/20 dark:border-white/20'}`}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? `${nameId}-error` : undefined}
                required
              />
              {errors.name && (
                <p id={`${nameId}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label htmlFor={phoneId} className="text-sm font-semibold text-black dark:text-white">
                Phone Number <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id={phoneId}
                type="tel"
                value={form.phone_no}
                onChange={set('phone_no')}
                placeholder="10-digit mobile number"
                className={`w-full border rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard ${errors.phone_no ? 'border-red-400' : 'border-black/20 dark:border-white/20'}`}
                aria-invalid={!!errors.phone_no}
                aria-describedby={errors.phone_no ? `${phoneId}-error` : undefined}
                required
              />
              {errors.phone_no && (
                <p id={`${phoneId}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.phone_no}
                </p>
              )}
            </div>

            {/* Company Name */}
            <div className="space-y-1">
              <label htmlFor={companyId} className="text-sm font-semibold text-black dark:text-white">
                Company Name
              </label>
              <input
                id={companyId}
                type="text"
                value={form.company_name}
                onChange={set('company_name')}
                placeholder="e.g. Acme Cosmetics"
                className="w-full border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label htmlFor={emailId} className="text-sm font-semibold text-black dark:text-white">
                Email Address
              </label>
              <input
                id={emailId}
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="e.g. client@example.com"
                className={`w-full border rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard ${errors.email ? 'border-red-400' : 'border-black/20 dark:border-white/20'}`}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? `${emailId}-error` : undefined}
              />
              {errors.email && (
                <p id={`${emailId}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.email}
                </p>
              )}
            </div>

            {/* City */}
            <div className="space-y-1">
              <label htmlFor={cityId} className="text-sm font-semibold text-black dark:text-white">
                City
              </label>
              <input
                id={cityId}
                type="text"
                value={form.city}
                onChange={set('city')}
                placeholder="e.g. Mumbai"
                className="w-full border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
              />
            </div>

            {/* GST Details */}
            <div className="space-y-1">
              <label htmlFor={gstId} className="text-sm font-semibold text-black dark:text-white">
                GST Details
              </label>
              <input
                id={gstId}
                type="text"
                value={form.gst_details}
                onChange={set('gst_details')}
                placeholder="GSTIN number"
                className="w-full border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
              />
            </div>

            {/* Client POC */}
            <div className="space-y-1">
              <label htmlFor={pocId} className="text-sm font-semibold text-black dark:text-white">
                Client POC
              </label>
              <select
                id={pocId}
                value={form.poc}
                onChange={set('poc')}
                className="w-full border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
              >
                <option value="">-- Assign a POC --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace('poc_', '')})
                  </option>
                ))}
              </select>
            </div>

            {/* Client Stage */}
            <div className="space-y-1">
              <label htmlFor={statusId} className="text-sm font-semibold text-black dark:text-white">
                Client Stage
              </label>
              <select
                id={statusId}
                value={form.status}
                onChange={set('status')}
                className="w-full border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
              >
                <option value="new_lead">New Lead – Not Contacted</option>
                <option value="interested_started">Interested – Project Started</option>
                <option value="not_interested_closed">Not Interested – Closed</option>
              </select>
            </div>
            
          </div>

          {/* Physical Address */}
          <div className="space-y-1">
            <label htmlFor={addressId} className="text-sm font-semibold text-black dark:text-white">
              Physical Address
            </label>
            <textarea
              id={addressId}
              value={form.physical_address}
              onChange={set('physical_address')}
              placeholder="Enter full office or factory address…"
              rows={3}
              className="w-full border border-black/20 dark:border-white/20 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-mustard"
            />
          </div>

          {/* Submit Error */}
          {submitError && (
            <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded">
              {submitError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={() => navigate('/crm/clients')}
              className="btn-secondary text-sm px-4"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-sm px-6"
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create Client'}
            </button>
          </div>

        </form>
      </div>
    </Layout>
  )
}
