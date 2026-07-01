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
}
