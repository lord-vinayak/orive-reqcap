// Used in browse records (BulkEmailModal)
export const EMAIL_TEMPLATES = [
  { value: 'welcome', label: 'Welcome Email' },
  { value: 'reminder_1', label: 'Reminder Email 1' },
  { value: 'reminder_2', label: 'Reminder Email 2' },
  { value: 'closure', label: 'Closure Email' },
] as const

export type EmailTemplateKey = typeof EMAIL_TEMPLATES[number]['value']

// ── Project email templates ───────────────────────────────────────────────────

export interface TemplateField {
  key: string
  label: string
  type: 'text' | 'date' | 'select'
  options?: string[]   // for select type
  placeholder?: string
  optional?: boolean   // if true, field can be left blank
}

// Used in CRM project detail (SendEmailModal) — matches the official email index order
export const PROJECT_EMAIL_TEMPLATES: { value: string; label: string }[] = [
  { value: 'sample_initiation', label: 'Sample Initiation Email' },
  { value: 'sample_approval', label: 'Sample Approval Email' },
  { value: 'order_booking_invoice', label: 'Order Booking Invoice Email' },
  { value: 'payment_confirmation', label: 'Payment Confirmation Email' },
  { value: 'design_content_approval', label: 'Design & Content Approval Email' },
  { value: 'packaging_confirmation', label: 'Packaging Confirmation Email' },
  { value: 'final_shipment', label: 'Final Shipment Email (Final Invoice)' },
  { value: 'costing', label: 'Costing Email' },
  { value: 'proposal', label: 'Proposal Email' },
  { value: 'commercial_sample_approval', label: 'Commercial Sample Approval Email' },
  { value: 'shipment_details', label: 'Shipment Details Email' },
]

// Dynamic fields per template — only define for templates that need user input
export const TEMPLATE_FIELDS: Record<string, TemplateField[]> = {
  sample_initiation: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
  ],
  sample_approval: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
    { key: 'product1_name', label: 'Product 1 Name', type: 'text', placeholder: 'e.g. Glow Serum' },
    { key: 'sample1_number', label: 'Product 1 — Sample No.', type: 'text', placeholder: 'e.g. 3' },
    { key: 'product2_name', label: 'Product 2 Name', type: 'text', optional: true },
    { key: 'sample2_number', label: 'Product 2 — Sample No.', type: 'text', optional: true },
    { key: 'product3_name', label: 'Product 3 Name', type: 'text', optional: true },
    { key: 'sample3_number', label: 'Product 3 — Sample No.', type: 'text', optional: true },
  ],
  order_booking_invoice: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
  ],
  payment_confirmation: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
    {
      key: 'payment_type',
      label: 'Payment Type',
      type: 'select',
      options: ['Product Sample', 'Packaging Sample', 'Order'],
    },
    { key: 'amount', label: 'Payment Amount Received (Rs.)', type: 'text', placeholder: 'e.g. 22,500' },
    { key: 'date', label: 'Date of Receipt', type: 'date' },
  ],
  design_content_approval: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
  ],
  packaging_confirmation: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
  ],
  final_shipment: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
  ],
  costing: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
  ],
  proposal: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
  ],
  commercial_sample_approval: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
    { key: 'tracking_link', label: 'Tracking Link', type: 'text', placeholder: 'e.g. https://track.example.com/...' },
  ],
  shipment_details: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
    {
      key: 'shipment_type',
      label: 'Shipment Type',
      type: 'select',
      options: ['Sample', 'Packaging', 'Commercial Sample', 'Final Production'],
    },
    { key: 'tracking_link', label: 'Tracking Link', type: 'text', placeholder: 'e.g. https://track.example.com/...' },
  ],
}
