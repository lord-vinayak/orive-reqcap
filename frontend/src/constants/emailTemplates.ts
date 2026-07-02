// Used in browse records (BulkEmailModal)
export const EMAIL_TEMPLATES = [
  { value: 'welcome', label: 'Welcome Email' },
  { value: 'reminder', label: 'Reminder Email' },
] as const

export type EmailTemplateKey = typeof EMAIL_TEMPLATES[number]['value']

// ── Project email templates ───────────────────────────────────────────────────

export interface TemplateField {
  key: string
  label: string
  type: 'text' | 'date' | 'select'
  options?: string[]   // for select type
  placeholder?: string
}

// Used in CRM project detail (SendEmailModal) — add entries here as templates are provided
export const PROJECT_EMAIL_TEMPLATES: { value: string; label: string }[] = [
  { value: 'sample_initiation', label: 'Sample Initiation Email' },
  { value: 'sample_payment_confirmation', label: 'Sample Payment Confirmation Email' },
  { value: 'sample_approval', label: 'Sample Approval Email' },
  { value: 'order_initiation', label: 'Order Initiation Email - 50% Order Booking' },
  { value: 'packaging_confirmation', label: 'Packaging Confirmation Email' },
]

// Dynamic fields per template — only define for templates that need user input
export const TEMPLATE_FIELDS: Record<string, TemplateField[]> = {
  sample_payment_confirmation: [
    { key: 'product_name', label: 'Product / Brand Name', type: 'text', placeholder: 'e.g. Glow Serum' },
    { key: 'payment_amount', label: 'Payment Amount Received (₹)', type: 'text', placeholder: 'e.g. 15,000' },
    { key: 'date_of_receipt', label: 'Date of Receipt', type: 'date' },
    {
      key: 'payment_type',
      label: 'Payment Type',
      type: 'select',
      options: ['Sample Payment', '10% Advance Against Order'],
    },
  ],
  sample_approval: [
    { key: 'product_name', label: 'Product Name', type: 'text', placeholder: 'e.g. Glow Serum' },
    { key: 'sample_number', label: 'Sample Number', type: 'text', placeholder: 'e.g. 3' },
  ],
  order_initiation: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
  ],
  packaging_confirmation: [
    { key: 'product_name', label: 'Product / Brand Name', type: 'text', placeholder: 'e.g. Glow Serum' },
    {
      key: 'packaging_type',
      label: 'Packaging Type',
      type: 'select',
      options: ['Bottle', 'Jar', 'Tube', 'Airless Pump', 'Dropper', 'Sachet', 'Other'],
    },
    { key: 'pack_size', label: 'Pack Size (ml / gm)', type: 'text', placeholder: 'e.g. 100 ml' },
    { key: 'moq', label: 'MOQ (Quantity)', type: 'text', placeholder: 'e.g. 500' },
    { key: 'unit_cost', label: 'Unit Cost (Rs.)', type: 'text', placeholder: 'e.g. 45.00' },
    { key: 'total_cost', label: 'Total Packaging Cost (Rs.)', type: 'text', placeholder: 'e.g. 22,500' },
    {
      key: 'printing_scope',
      label: 'Printing / Label Scope',
      type: 'select',
      options: ['Included', 'Not Included', 'Separate'],
    },
    { key: 'procurement_timeline', label: 'Expected Procurement Timeline', type: 'text', placeholder: 'e.g. 3–4 weeks' },
  ],
}
