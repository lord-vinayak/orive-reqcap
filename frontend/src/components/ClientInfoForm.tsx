import type { Client } from '@/types'
import { PRODUCT_COUNTS } from '@/utils/dropdownOptions'
import { useAuthStore } from '@/store/authStore'

interface Props {
  client: Partial<Client>
  onClientChange: (next: Partial<Client>) => void
  targetAge: string
  onTargetAgeChange: (val: string) => void
  noOfProducts: number | null
  onNoOfProductsChange: (val: number | null) => void
  readOnlyPhone?: boolean
}

/**
 * Simplified Client Info per latest PRD.
 * Fields:
 *   1. Client name        (manual)
 *   2. Client Phone no    (primary key, manual)
 *   3. Client POC         (auto from logged-in user — locked, not editable)
 *   4. No. of products    (dropdown)
 *   5. Target Audience Age (open text)
 */
export default function ClientInfoForm({
  client, onClientChange, targetAge, onTargetAgeChange,
  noOfProducts, onNoOfProductsChange, readOnlyPhone = false,
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
          <p id="phone-help" className="text-xs text-black/50 mt-1">
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
            className="w-full bg-black/[0.04] cursor-not-allowed"
            aria-readonly="true"
            aria-describedby="poc-help"
          />
          <p id="poc-help" className="text-xs text-black/50 mt-1">
            Automatically set to the logged-in user.
          </p>
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

        <div>
          <label htmlFor="ci_age" className="block mb-1">Target audience age</label>
          <input
            id="ci_age"
            value={targetAge}
            onChange={(e) => onTargetAgeChange(e.target.value)}
            placeholder="e.g. 25-40"
            className="w-full"
          />
        </div>
      </div>
    </section>
  )
}
