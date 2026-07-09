import { useEffect, useState } from "react";
import type { Client, RequirementProduct, User } from "@/types";
import { PRODUCT_COUNTS } from "@/utils/dropdownOptions";
import { useAuthStore } from "@/store/authStore";
import { userService } from "@/services";
import AudioCaptureButton from "./AudioCaptureButton";
import { LEAD_STATUS_OPTIONS, LEAD_SUB_STATUS_OPTIONS, type LeadStatus } from "@/constants/clientStatus";

interface Props {
  client: Partial<Client>;
  onClientChange: (next: Partial<Client>) => void;
  targetAge: string;
  onTargetAgeChange: (val: string) => void;
  readOnlyPhone?: boolean;
  onExtract: (fields: Partial<RequirementProduct>) => void;
}

/**
 * Client Info form — all client fields.
 * Required: name, phone_no.
 * Optional: company_name, email, city, no_of_products,
 *           planned_selling_price_range, how_many_units_per_product,
 *           physical_address, gst_details, poc.
 * Defaults: poc defaults to the logged-in user for a brand-new client, but is
 *           editable and doesn't get overwritten on later saves.
 */
export default function ClientInfoForm({
  client,
  onClientChange,
  targetAge,
  onTargetAgeChange,
  readOnlyPhone = false,
  onExtract,
}: Props) {
  const currentUser = useAuthStore((s) => s.user);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    userService.list().then((data) => {
      setUsers(Array.isArray(data) ? data : data.results);
    }).catch(() => {});
  }, []);

  const patch = (fields: Partial<Client>) =>
    onClientChange({ ...client, ...fields });

  // New client (no poc set yet) defaults to the logged-in user, once.
  useEffect(() => {
    if (!client.phone_no && !client.poc && currentUser) {
      patch({ poc: currentUser.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  return (
    <section className="card" aria-labelledby="client-info-heading">
      <h2 id="client-info-heading" className="text-lg font-semibold mb-4">
        Client Info
      </h2>

      {/* ── Primary fields ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ci_name" className="block mb-1">
            Client name{" "}
            <span className="text-red-700" aria-hidden="true">*</span>
          </label>
          <input
            id="ci_name"
            value={client.name || ""}
            onChange={(e) => patch({ name: e.target.value })}
            required
            className="w-full"
            aria-required="true"
          />
        </div>

        <div>
          <label htmlFor="ci_phone" className="block mb-1">
            Phone number{" "}
            <span className="text-red-700" aria-hidden="true">*</span>
          </label>
          <input
            id="ci_phone"
            type="tel"
            value={client.phone_no || ""}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
              patch({ phone_no: val });
            }}
            readOnly={readOnlyPhone}
            required
            inputMode="numeric"
            pattern="\d{10}"
            maxLength={10}
            autoComplete="tel"
            className="w-full"
            aria-required="true"
            aria-describedby="phone-help phone-error"
          />
          {!readOnlyPhone &&
            (client.phone_no?.length ?? 0) > 0 &&
            (client.phone_no?.length ?? 0) !== 10 && (
              <p id="phone-error" role="alert" className="text-xs text-red-700 mt-1">
                Phone number must be 10 digits.
              </p>
            )}
          <p id="phone-help" className="text-xs text-black/60 dark:text-slate-300 mt-1">
            Primary key — used to link all data.
          </p>
        </div>

        <div>
          <label htmlFor="ci_company" className="block mb-1">
            Company name <span className="text-black/60 dark:text-slate-300 text-xs">(optional)</span>
          </label>
          <input
            id="ci_company"
            value={client.company_name || ""}
            onChange={(e) => patch({ company_name: e.target.value })}
            autoComplete="organization"
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="ci_email" className="block mb-1">
            Email
          </label>
          <input
            id="ci_email"
            type="email"
            value={client.email || ""}
            onChange={(e) => patch({ email: e.target.value })}
            autoComplete="email"
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="ci_city" className="block mb-1">
            City
          </label>
          <input
            id="ci_city"
            value={client.city || ""}
            onChange={(e) => patch({ city: e.target.value })}
            autoComplete="address-level2"
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="ci_poc" className="block mb-1">
            Point of Contact
          </label>
          <select
            id="ci_poc"
            value={client.poc || ""}
            onChange={(e) => patch({ poc: e.target.value || null })}
            className="w-full"
            aria-describedby="poc-help"
          >
            <option value="">— None —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <p id="poc-help" className="text-xs text-black/60 dark:text-slate-300 mt-1">
            Defaults to you for new clients; only changes if you pick someone else.
          </p>
        </div>

        <div>
          <label htmlFor="ci_lead_status" className="block mb-1">Lead Status</label>
          <select
            id="ci_lead_status"
            value={client.lead_status || "initial_conversation"}
            onChange={(e) => patch({ lead_status: e.target.value as LeadStatus, lead_sub_status: '' })}
            className="w-full"
          >
            {LEAD_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {(LEAD_SUB_STATUS_OPTIONS[client.lead_status as LeadStatus]?.length ?? 0) > 0 && (
          <div>
            <label htmlFor="ci_lead_sub_status" className="block mb-1">Sub-status</label>
            <select
              id="ci_lead_sub_status"
              value={client.lead_sub_status || ""}
              onChange={(e) => patch({ lead_sub_status: e.target.value })}
              className="w-full"
            >
              <option value="">— None —</option>
              {LEAD_SUB_STATUS_OPTIONS[client.lead_status as LeadStatus]!.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="ci_noprod" className="block mb-1">
            Number of Products
          </label>
          <select
            id="ci_noprod"
            value={client.no_of_products ?? ""}
            onChange={(e) =>
              patch({ no_of_products: e.target.value ? Number(e.target.value) : null })
            }
            className="w-full"
          >
            <option value="">—</option>
            {PRODUCT_COUNTS.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ci_price_range" className="block mb-1">
            Planned selling price range{" "}
            <span className="text-black/60 dark:text-slate-300 text-xs">(optional)</span>
          </label>
          <input
            id="ci_price_range"
            type="number"
            step="1"
            min={0}
            value={client.planned_selling_price_range || ""}
            onChange={(e) => patch({ planned_selling_price_range: e.target.value })}
            placeholder="e.g. 500"
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="ci_units" className="block mb-1">
            Units per product{" "}
            <span className="text-black/60 dark:text-slate-300 text-xs">(optional)</span>
          </label>
          <input
            id="ci_units"
            type="number"
            min={1}
            value={client.how_many_units_per_product ?? ""}
            onChange={(e) =>
              patch({ how_many_units_per_product: e.target.value ? Number(e.target.value) : null })
            }
            placeholder="e.g. 1000"
            className="w-full"
          />
        </div>

        {/* Target Audience Age + Audio Capture */}
        <div>
          <label htmlFor="ci_age" className="block mb-1">
            Target audience age
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              id="ci_age"
              type="number"
              step="1"
              min={0}
              value={targetAge}
              onChange={(e) => onTargetAgeChange(e.target.value)}
              placeholder="e.g. 30"
              className="flex-1 min-w-0"
              aria-describedby="age-audio-hint"
            />
            <AudioCaptureButton onExtract={onExtract} />
          </div>
          <p id="age-audio-hint" className="text-xs text-black/60 dark:text-slate-300 mt-1">
            Press{" "}
            <kbd className="px-1 py-0.5 rounded border border-black/20 text-xs font-mono">
              Alt+R
            </kbd>{" "}
            to toggle audio recording
          </p>
        </div>
      </div>

      {/* ── Optional details accordion ── */}
      <div className="mt-6 border-t border-black/10 dark:border-white/10 pt-4">
        <button
          type="button"
          onClick={() => setOptionalOpen((v) => !v)}
          className="flex items-center gap-2 w-full text-left text-sm font-medium text-black/60 dark:text-slate-300 hover:text-black dark:hover:text-slate-100 transition-colors"
          aria-expanded={optionalOpen}
          aria-controls="optional-details-panel"
        >
          <svg
            className={`w-4 h-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${optionalOpen ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Optional Details
          {(client.physical_address || client.gst_details) && !optionalOpen && (
            <span className="ml-1 text-xs text-mustard-600 dark:text-mustard-400">(filled)</span>
          )}
        </button>

        <div id="optional-details-panel" hidden={!optionalOpen} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="ci_address" className="block mb-1">
                Physical Address
              </label>
              <textarea
                id="ci_address"
                value={client.physical_address || ""}
                onChange={(e) => patch({ physical_address: e.target.value })}
                rows={2}
                className="w-full resize-y"
                placeholder="Street, City, Pincode"
              />
            </div>

            <div>
              <label htmlFor="ci_gst" className="block mb-1">
                GST Details
              </label>
              <input
                id="ci_gst"
                value={client.gst_details || ""}
                onChange={(e) => patch({ gst_details: e.target.value.toUpperCase() })}
                placeholder="e.g. 27AAPFU0939F1ZV"
                className="w-full"
              />
            </div>
          </div>
      </div>
    </section>
  );
}
