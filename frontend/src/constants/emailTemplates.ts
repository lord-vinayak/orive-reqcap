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

// Used in CRM project detail (SendEmailModal) — add entries here as templates are provided
export const PROJECT_EMAIL_TEMPLATES: { value: string; label: string }[] = [
  { value: 'sample_initiation', label: 'Sample Initiation Email' },
  { value: 'sample_payment_confirmation', label: 'Sample Payment Confirmation Email' },
  { value: 'sample_approval', label: 'Sample Approval Email' },
  { value: 'order_initiation', label: 'Order Initiation Email - 50% Order Booking' },
  { value: 'packaging_confirmation', label: 'Packaging Confirmation Email' },
  { value: 'packaging_payment_confirmation', label: 'Packaging Payment Confirmation Email' },
  { value: 'printing_confirmation', label: 'Printing Confirmation Email' },
  { value: 'printing_payment_confirmation', label: 'Printing Payment Confirmation Email' },
  { value: 'final_order_shipment', label: 'Final Order Shipment Email with Final Invoice' },
  { value: 'invoice', label: 'Invoice Email (Packaging / Printing / Order)' },
  { value: 'payment_confirmation', label: 'Payment Confirmation Email' },
  { value: 'order_confirmation', label: 'Order Confirmation Email' },
]

// Dynamic fields per template — only define for templates that need user input
export const TEMPLATE_FIELDS: Record<string, TemplateField[]> = {
  sample_initiation: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
  ],
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
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
    { key: 'product1_name', label: 'Product 1 Name', type: 'text', placeholder: 'e.g. Glow Serum' },
    { key: 'sample1_number', label: 'Product 1 — Sample No.', type: 'text', placeholder: 'e.g. 3' },
    { key: 'product2_name', label: 'Product 2 Name', type: 'text', optional: true },
    { key: 'sample2_number', label: 'Product 2 — Sample No.', type: 'text', optional: true },
    { key: 'product3_name', label: 'Product 3 Name', type: 'text', optional: true },
    { key: 'sample3_number', label: 'Product 3 — Sample No.', type: 'text', optional: true },
  ],
  order_initiation: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
  ],
  packaging_confirmation: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
  ],
  final_order_shipment: [
    { key: 'product_name', label: 'Product / Brand Name', type: 'text', placeholder: 'e.g. Glow Serum' },
    { key: 'final_payment_amount', label: 'Final Payment Due (Rs.)', type: 'text', placeholder: 'e.g. 50,000' },
    { key: 'payment_completion_date', label: 'Payment Completion Date', type: 'date' },
    { key: 'sku_details', label: 'Order / SKU Details', type: 'text', placeholder: 'e.g. Glow Serum 50ml × 500 units' },
    {
      key: 'shipment_mode',
      label: 'Shipment Mode',
      type: 'select',
      options: ['Courier', 'Transport', 'Client Pickup'],
    },
    {
      key: 'insurance_status',
      label: 'Insurance Status',
      type: 'select',
      options: ['To be activated post payment', 'Activated'],
    },
  ],
  printing_payment_confirmation: [
    { key: 'product_name', label: 'Product / Brand Name', type: 'text', placeholder: 'e.g. Glow Serum' },
    { key: 'payment_amount', label: 'Payment Amount Received (Rs.)', type: 'text', placeholder: 'e.g. 8,500' },
    { key: 'date_of_receipt', label: 'Date of Receipt', type: 'date' },
  ],
  printing_confirmation: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
  ],
  invoice: [
    { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'e.g. Lumière' },
    {
      key: 'payment_type',
      label: 'Payment Type',
      type: 'select',
      options: ['Product Sample', 'Packaging Sample', 'Order'],
    },
    { key: 'amount', label: 'Payment Amount (Rs.)', type: 'text', placeholder: 'e.g. 22,500' },
    { key: 'date', label: 'Date of Invoice', type: 'date' },
  ],
  order_confirmation: [
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
  packaging_payment_confirmation: [
    { key: 'product_name', label: 'Product / Brand Name', type: 'text', placeholder: 'e.g. Glow Serum' },
    { key: 'payment_amount', label: 'Payment Amount Received (Rs.)', type: 'text', placeholder: 'e.g. 22,500' },
    { key: 'date_of_receipt', label: 'Date of Receipt', type: 'date' },
  ],
}
