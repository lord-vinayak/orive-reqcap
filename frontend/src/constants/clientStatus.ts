export type LeadStatus =
  | 'initial_conversation'
  | 'proposal'
  | 'costing'
  | 'sample'
  | 'order'
  | 'production'
  | 'testing'
  | 'filling'
  | 'order_dispatch'
  | 'order_closed'
  | 'on_hold'
  | 'lead_closed'

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'initial_conversation', label: 'Initial Conversation' },
  { value: 'proposal',             label: 'Proposal' },
  { value: 'costing',                      label: 'Costing' },
  { value: 'sample',                       label: 'Sample' },
  { value: 'order',                        label: 'Order' },
  { value: 'production',                   label: 'Production' },
  { value: 'testing',                      label: 'Testing' },
  { value: 'filling',                      label: 'Filling' },
  { value: 'order_dispatch',               label: 'Order Dispatch' },
  { value: 'order_closed',                 label: 'Order Closed' },
  { value: 'on_hold',                      label: 'On Hold' },
  { value: 'lead_closed',                  label: 'Lead Closed' },
]

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = Object.fromEntries(
  LEAD_STATUS_OPTIONS.map(({ value, label }) => [value, label])
) as Record<LeadStatus, string>

export const LEAD_STATUS_COLOR: Record<LeadStatus, string> = {
  initial_conversation: 'bg-blue-50    text-blue-700    border-blue-200    dark:bg-blue-900/30    dark:text-blue-300    dark:border-blue-700',
  proposal:                     'bg-purple-50  text-purple-700  border-purple-200  dark:bg-purple-900/30  dark:text-purple-300  dark:border-purple-700',
  costing:                      'bg-amber-50   text-amber-700   border-amber-200   dark:bg-amber-900/30   dark:text-amber-300   dark:border-amber-700',
  sample:                       'bg-orange-50  text-orange-700  border-orange-200  dark:bg-orange-900/30  dark:text-orange-300  dark:border-orange-700',
  order:                        'bg-teal-50    text-teal-700    border-teal-200    dark:bg-teal-900/30    dark:text-teal-300    dark:border-teal-700',
  production:                   'bg-cyan-50    text-cyan-700    border-cyan-200    dark:bg-cyan-900/30    dark:text-cyan-300    dark:border-cyan-700',
  testing:                      'bg-sky-50     text-sky-700     border-sky-200     dark:bg-sky-900/30     dark:text-sky-300     dark:border-sky-700',
  filling:                      'bg-lime-50    text-lime-700    border-lime-200    dark:bg-lime-900/30    dark:text-lime-300    dark:border-lime-700',
  order_dispatch:               'bg-green-50   text-green-700   border-green-200   dark:bg-green-900/30   dark:text-green-300   dark:border-green-700',
  order_closed:                 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  on_hold:                      'bg-black/5    text-black/60    border-black/10    dark:bg-white/5        dark:text-slate-400   dark:border-white/10',
  lead_closed:                  'bg-red-50     text-red-700     border-red-200     dark:bg-red-900/30     dark:text-red-300     dark:border-red-700',
}

export interface SubStatusOption { value: string; label: string }

export const LEAD_SUB_STATUS_OPTIONS: Partial<Record<LeadStatus, SubStatusOption[]>> = {
  initial_conversation: [
    { value: 'initial_conversation__product_requirement_captured', label: 'Product Requirement Captured' },
  ],
  proposal: [
    { value: 'proposal__requested', label: 'Requested' },
    { value: 'proposal__send',      label: 'Send' },
    { value: 'proposal__approved',  label: 'Approved' },
  ],
  costing: [
    { value: 'costing__requested', label: 'Requested' },
    { value: 'costing__send',      label: 'Send' },
    { value: 'costing__approved',  label: 'Approved' },
  ],
  sample: [
    { value: 'sample__invoice_shared',      label: 'Invoice Shared' },
    { value: 'sample__sample_booked',       label: 'Sample Booked' },
    { value: 'sample__approval_email_sent', label: 'Sample Approval Email Sent' },
    { value: 'sample__formula_created',     label: 'Formula Created' },
    { value: 'sample__formula_approved',    label: 'Formula Approved' },
    { value: 'sample__in_pipeline',         label: 'Sample in Pipeline' },
    { value: 'sample__sample_made',         label: 'Sample Made' },
    { value: 'sample__in_transit',          label: 'In Transit' },
    { value: 'sample__user_testing',        label: 'User Testing' },
    { value: 'sample__approved',            label: 'Approved' },
    { value: 'sample__not_approved',        label: 'Not Approved' },
    { value: 'sample__resample',            label: 'Resample' },
  ],
  order: [
    { value: 'order__invoice_shared', label: 'Invoice Shared' },
    { value: 'order__order_booked',   label: 'Order Booked' },
  ],
  production: [
    { value: 'production__packaging', label: 'Packaging' },
    { value: 'production__content',   label: 'Content' },
    { value: 'production__design',    label: 'Design' },
    { value: 'production__printing',  label: 'Printing' },
  ],
  testing: [
    { value: 'testing__batch', label: 'Batch' },
    { value: 'testing__derma', label: 'Derma' },
  ],
  filling: [
    { value: 'filling__filling',             label: 'Filling' },
    { value: 'filling__logistics_acquired',  label: 'Logistics Details Acquired' },
  ],
  order_dispatch: [
    { value: 'order_dispatch__invoice_shared',  label: 'Final Invoice Shared' },
    { value: 'order_dispatch__payment_made',    label: 'Final Payment Made' },
    { value: 'order_dispatch__eway_bill',       label: 'EWAY Bill Created' },
    { value: 'order_dispatch__shipment_booked', label: 'Shipment Booked' },
    { value: 'order_dispatch__in_transit',      label: 'Shipment in Transit' },
    { value: 'order_dispatch__delivered',       label: 'Shipment Delivered' },
  ],
  order_closed: [
    { value: 'order_closed__feedback_captured', label: 'Feedback Captured' },
  ],
  lead_closed: [
    { value: 'lead_closed__not_responding',  label: 'Not Responding' },
    { value: 'lead_closed__language_issue',  label: 'Language Issue' },
    { value: 'lead_closed__not_reachable',   label: 'Not Reachable' },
    { value: 'lead_closed__costing_high',    label: 'Costing High' },
    { value: 'lead_closed__others',          label: 'Others' },
    { value: 'lead_closed__on_hold',         label: 'On Hold' },
  ],
}

export function getSubStatusLabel(subStatus: string): string {
  for (const opts of Object.values(LEAD_SUB_STATUS_OPTIONS)) {
    const found = opts?.find((o) => o.value === subStatus)
    if (found) return found.label
  }
  return subStatus
}

export function formatLeadStatus(leadStatus: LeadStatus | string, subStatus?: string): string {
  const main = LEAD_STATUS_LABEL[leadStatus as LeadStatus] ?? leadStatus
  if (!subStatus) return main
  const sub = getSubStatusLabel(subStatus)
  return `${main} · ${sub}`
}
