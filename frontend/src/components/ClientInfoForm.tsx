import type { Client, RequirementProduct } from '@/types'
import { PRODUCT_COUNTS } from '@/utils/dropdownOptions'
import { useAuthStore } from '@/store/authStore'
import AudioCaptureButton from './AudioCaptureButton'

const CLIENT_STATUS_OPTIONS: { value: Client['status']; label: string }[] = [
  { value: 'new_lead',              label: 'New Lead' },
  { value: 'interested_started',    label: 'Interested – Project Started' },
  { value: 'not_interested_closed', label: 'Not Interested – Closed' },
]

interface Props {
  client: Partial<Client>
  onClientChange: (next: Partial<Client>) => void
  targetAge: string
  onTargetAgeChange: (val: string) => void
  noOfProducts: number | null
  onNoOfProductsChange: (val: number | null) => void
  readOnlyPhone?: boolean
  onExtract: (fields: Partial<RequirementProduct>) => void
}

/**
 * Client Info form.
 * Fields:
 *   1. Client name        (manual)
 *   2. Client Phone no    (primary key, manual)
 *   3. Client POC         (auto from logged-in user — locked)
 *   4. Client Status      (dropdown)
 *   5. No. of products    (dropdown)
 *   6. Target Audience Age (open text) + Audio Capture button (Alt+R shortcut)
 */
export default function ClientInfoForm({
  client, onClientChange, targetAge, onTargetAgeChange,
  noOfProducts, onNoOfProductsChange, readOnlyPhone = false,
  onExtract,
}: Props) {
  const currentUser = useAuthStore((s) => s.user)

  return (
    <section className="card" aria-labelledby="client-info-heading">
      <h2 id="client-info-heading" className="text-lg font-semibold mb-4">Client Info</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ci_name" className="block mb-1">
            Client name <span className="text-red-700" aria-hidden="true">*</span>
          </label>
          <input
            id="ci_name"
            value={client.name || ''}
            onChange={(e) => onClientChange({ ...client, name: e.target.value })}
            required
            className="w-full"
            aria-required="true"
          />
        </div>

        <div>
          <label htmlFor="ci_phone" className="block mb-1">
            Client phone no <span className="text-red-700" aria-hidden="true">*</span>
          </label>
          <input
            id="ci_phone"
            value={client.phone_no || ''}
            onChange={(e) => onClientChange({ ...client, phone_no: e.target.value })}
            readOnly={readOnlyPhone}
            required
            className="w-full"
            aria-required="true"
            aria-describedby="phone-help"
          />
          <p id="phone-help" className="text-xs text-black/60 dark:text-slate-400 mt-1">
            Primary key — links across the entire CRM.
          </p>
        </div>

        <div>
          <label htmlFor="ci_poc" className="block mb-1">Client Point of Contact</label>
          <input
            id="ci_poc"
            value={currentUser?.name || ''}
            readOnly
            disabled
            className="w-full bg-black/[0.04] dark:bg-white/[0.06] cursor-not-allowed"
            aria-readonly="true"
            aria-describedby="poc-help"
          />
          <p id="poc-help" className="text-xs text-black/60 dark:text-slate-400 mt-1">
            Automatically set to the logged-in user.
          </p>
        </div>

        <div>
          <label htmlFor="ci_status" className="block mb-1">Client Status</label>
          <select
            id="ci_status"
            value={client.status || 'new_lead'}
            onChange={(e) => onClientChange({ ...client, status: e.target.value as Client['status'] })}
            className="w-full"
            aria-describedby="status-help"
          >
            {CLIENT_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p id="status-help" className="sr-only">Current sales pipeline status for this client</p>
        </div>

        <div>
          <label htmlFor="ci_noprod" className="block mb-1">Number of Products</label>
          <select
            id="ci_noprod"
            value={noOfProducts ?? ''}
            onChange={(e) => onNoOfProductsChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full"
          >
            <option value="">—</option>
            {PRODUCT_COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Target Audience Age + Audio Capture button side by side */}
        <div>
          <label htmlFor="ci_age" className="block mb-1">Target audience age</label>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              id="ci_age"
              value={targetAge}
              onChange={(e) => onTargetAgeChange(e.target.value)}
              placeholder="e.g. 25-40"
              className="flex-1 min-w-0"
              aria-describedby="age-audio-hint"
            />
            <AudioCaptureButton onExtract={onExtract} />
          </div>
          <p id="age-audio-hint" className="text-xs text-black/60 dark:text-slate-400 mt-1">
            Press <kbd className="px-1 py-0.5 rounded border border-black/20 text-xs font-mono">Alt+R</kbd> to toggle audio recording
          </p>
        </div>
      </div>
    </section>
  )
}
