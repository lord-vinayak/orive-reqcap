// Used in browse records (BulkEmailModal)
export const EMAIL_TEMPLATES = [
  { value: 'welcome', label: 'Welcome Email' },
  { value: 'reminder', label: 'Reminder Email' },
] as const

export type EmailTemplateKey = typeof EMAIL_TEMPLATES[number]['value']

// Used in CRM project detail (SendEmailModal) — add entries here as templates are provided
export const PROJECT_EMAIL_TEMPLATES: { value: string; label: string }[] = []
