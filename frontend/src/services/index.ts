import { api } from './api'
import type {
  Client, Requirement, RequirementProduct, Note, FileRecord,
  CatalogItem, Proposal, ProposalItem, User, ProposalDocument,
} from '@/types'

export interface SendEmailPayload {
  to_email: string
  save_email: boolean
  proposal_doc_ids?: string[]
}

export interface SendEmailResult {
  sent_at: string
  sent_to: string
  subject: string
  sent_by_name: string
}

export interface BulkUploadRow {
  row: number
  name: string
  phone: string
  warning?: string
}

export interface BulkUploadSkipRow extends BulkUploadRow {
  reason: string
}

export interface BulkUploadResult {
  created: BulkUploadRow[]
  skipped: BulkUploadSkipRow[]
}

export interface WelcomeEmailResult {
  sent: string[]
  skipped: { phone_no: string; reason: string }[]
}

export interface EmailLogAttachment {
  filename: string
  drive_url: string
  drive_file_id: string
}

export interface EmailLog {
  id: string
  email_type: string
  email_type_label: string
  recipient_email: string
  subject: string
  sent_by_name: string
  sent_at: string
  attachments: EmailLogAttachment[]
  project: string | null
  project_no: string | null
}

export const clientService = {
  list: async (params: { q?: string; poc?: string; lead_status?: string; created_after?: string; created_before?: string; page_size?: number; page?: number } = {}) =>
    (await api.get<{ count: number; next: string | null; previous: string | null; results: Client[] } | Client[]>('/clients/', { params })).data,
  get: async (phone: string) => (await api.get<Client>(`/clients/${phone}/`)).data,
  create: async (data: Partial<Client>) => (await api.post<Client>('/clients/', data)).data,
  update: async (phone: string, data: Partial<Client>) =>
    (await api.put<Client>(`/clients/${phone}/`, data)).data,
  patch: async (phone: string, data: Partial<Client>) =>
    (await api.patch<Client>(`/clients/${phone}/`, data)).data,

  /** Upload an Excel file; returns per-row created/skipped breakdown. */
  bulkUpload: async (file: File): Promise<BulkUploadResult> => {
    const form = new FormData()
    form.append('file', file)
    return (await api.post<BulkUploadResult>('/clients/bulk-upload/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data
  },

  /** Send a welcome or reminder email to the given clients (by phone_no). JSON — no attachments. */
  sendWelcomeEmail: async (phoneNos: string[], emailType: 'welcome' | 'reminder' = 'welcome'): Promise<WelcomeEmailResult> =>
    (await api.post<WelcomeEmailResult>('/clients/send-welcome-email/', { phone_nos: phoneNos, email_type: emailType })).data,

  /** Send a project email (multipart — supports file attachments and extra template fields). */
  sendProjectEmail: async (
    phoneNo: string,
    emailType: string,
    projectId: string,
    files: File[],
    extraCtx: Record<string, string> = {},
    invoiceIds: string[] = [],
  ): Promise<WelcomeEmailResult> => {
    const form = new FormData()
    form.append('phone_nos', JSON.stringify([phoneNo]))
    form.append('email_type', emailType)
    form.append('project_id', projectId)
    form.append('extra_ctx', JSON.stringify(extraCtx))
    form.append('invoice_ids', JSON.stringify(invoiceIds))
    files.forEach((f) => form.append('files', f))
    return (await api.post<WelcomeEmailResult>('/clients/send-welcome-email/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data
  },

  /** Fetch email history for a client. */
  getEmailHistory: async (phone: string): Promise<EmailLog[]> =>
    (await api.get<EmailLog[]>(`/clients/${phone}/email-history/`)).data,

  /** Bulk-update lead_status (and optionally lead_sub_status) for the given clients. */
  bulkUpdateLeadStatus: async (phoneNos: string[], leadStatus: string, leadSubStatus = ''): Promise<{ updated: number }> =>
    (await api.patch<{ updated: number }>('/clients/bulk-update-status/', { phone_nos: phoneNos, lead_status: leadStatus, lead_sub_status: leadSubStatus })).data,

  /** Download the blank upload template .xlsx */
  downloadTemplate: () =>
    api.get('/clients/upload-template/', { responseType: 'blob' }).then((r) => {
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'client_upload_template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    }),
}

export const requirementService = {
  list: async (params: Record<string, string | number> = {}) =>
    (await api.get<{ count: number; next: string | null; results: Requirement[] } | Requirement[]>('/requirements/', { params })).data,
  listForClient: async (phone: string) =>
    (await api.get<{ results: Requirement[] } | Requirement[]>('/requirements/', { params: { client_phone: phone } })).data,
  get: async (id: string) => (await api.get<Requirement>(`/requirements/${id}/`)).data,
  create: async (data: Partial<Requirement>) => (await api.post<Requirement>('/requirements/', data)).data,
  patch: async (id: string, data: Partial<Requirement>) => (await api.patch<Requirement>(`/requirements/${id}/`, data)).data,
  addProduct: async (id: string, data: Partial<RequirementProduct> = {}) =>
    (await api.post<RequirementProduct>(`/requirements/${id}/products/`, data)).data,
  updateProduct: async (reqId: string, pid: string, data: Partial<RequirementProduct>) =>
    (await api.patch<RequirementProduct>(`/requirements/${reqId}/products/${pid}/`, data)).data,
  deleteProduct: async (reqId: string, pid: string) =>
    api.delete(`/requirements/${reqId}/products/${pid}/`),
}

export const notesService = {
  list: async (reqId: string) => (await api.get<Note[]>(`/requirements/${reqId}/notes/`)).data,
  add: async (reqId: string, text: string) =>
    (await api.post<Note>(`/requirements/${reqId}/notes/`, { text })).data,
  update: async (id: string, text: string) =>
    (await api.patch<Note>(`/notes/${id}/`, { text })).data,
  delete: async (id: string) => api.delete(`/notes/${id}/`),
}

/** Marker prefix used to identify auto-generated mirror notes
 *  (packaging notes / color details / fragrance details from product rows). */
export const AUTO_NOTE_MARKER_RE = /^\[AUTO\|([^|]+)\|([^\]]+)\]\s*/

export function buildAutoNoteText(rowId: string, field: string, rowNumber: number, value: string, bodyPart: string, category: string, subCategory: string) {
  const label = field === 'packaging_notes'  ? 'Packaging notes'
             : field === 'color_details'     ? 'Color details'
             : field === 'fragrance_details' ? 'Fragrance details'
             : field
  const bp = bodyPart || 'N/A'
  const cat = category || 'N/A'
  const sub = subCategory || 'N/A'
  return `[AUTO|${rowId}|${field}] #${rowNumber} | ${bp} | ${cat} | ${sub} — ${label}: ${value}`
}

export const fileService = {
  list: async (reqId: string) => (await api.get<FileRecord[]>(`/requirements/${reqId}/files/`)).data,
  upload: async (reqId: string, file: File, productId?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (productId) form.append('product_id', productId)
    const { data } = await api.post<FileRecord>(`/requirements/${reqId}/files/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  delete: async (id: string) => api.delete(`/files/${id}/`),
}

export const proposalDocService = {
  list: async (reqId: string): Promise<ProposalDocument[]> =>
    (await api.get<ProposalDocument[]>(`/requirements/${reqId}/proposal-documents/`)).data,

  upload: async (reqId: string, file: File): Promise<ProposalDocument> => {
    const form = new FormData()
    form.append('file', file)
    return (await api.post<ProposalDocument>(`/requirements/${reqId}/proposal-documents/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data
  },
}

export const catalogService = {
  search: async (params: Record<string, string | string[]>) => {
    const { data } = await api.get<{ results: CatalogItem[] } | CatalogItem[]>('/catalog/', {
      params,
      paramsSerializer: (p) => {
        const parts: string[] = []
        for (const [k, v] of Object.entries(p)) {
          if (Array.isArray(v)) {
            v.forEach((item) => parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(item)}`))
          } else if (v !== '' && v !== undefined && v !== null) {
            parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
          }
        }
        return parts.join('&')
      },
    })
    return Array.isArray(data) ? data : data.results
  },
  facets: async (params: Record<string, string> = {}) =>
    (await api.get<{ body_parts: string[]; product_types: string[]; sub_product_types: string[]; key_benefits: string[]; rate_categories: string[] }>(
      '/catalog/facets/', { params })).data,
  create: async (data: Partial<CatalogItem>) => (await api.post<CatalogItem>('/catalog/', data)).data,
  update: async (id: string, data: Partial<CatalogItem>) => (await api.patch<CatalogItem>(`/catalog/${id}/`, data)).data,
  delete: async (id: string) => api.delete(`/catalog/${id}/`),
  importXlsx: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post('/catalog/import_xlsx/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  downloadTemplate: async () => {
    const response = await api.get('/catalog/download_template/', { responseType: 'blob' })
    return response.data as Blob
  },
}

export const proposalService = {
  /** Get the latest proposal for a requirement (creates one if none exist). */
  getForRequirement: async (reqId: string) =>
    (await api.get<Proposal>(`/requirements/${reqId}/proposal/`)).data,
  /** List ALL proposals for a requirement, newest first. */
  listForRequirement: async (reqId: string) =>
    (await api.get<Proposal[]>(`/requirements/${reqId}/proposals/`)).data,
  /** Create a fresh blank proposal alongside existing ones. */
  createNew: async (reqId: string) =>
    (await api.post<Proposal>(`/requirements/${reqId}/proposals/new/`)).data,
  /** Add a catalog-linked item. The backend snapshots catalog fields and injects cost defaults. */
  addItem: async (proposalId: string, catalogItemId: string) =>
    (await api.post<ProposalItem>(`/proposals/${proposalId}/items/`, { catalog_item: catalogItemId })).data,
  /** Add a freeform (non-catalog) item. The backend injects cost defaults for any fields not supplied. */
  addFreeformItem: async (proposalId: string, snapshot: Partial<ProposalItem['catalog_data']>) =>
    (await api.post<ProposalItem>(`/proposals/${proposalId}/items/`, { snapshot })).data,
  /** Update any snapshot field of an existing Client Costing item. */
  updateItem: async (itemId: string, patch: Partial<ProposalItem['catalog_data']>) =>
    (await api.patch<ProposalItem>(`/proposal-items/${itemId}/`, { snapshot: patch })).data,
  removeItem: async (itemId: string) => api.delete(`/proposal-items/${itemId}/`),
  exportXlsx: async (proposalId: string) => {
    const response = await api.get(`/proposals/${proposalId}/export/`, { responseType: 'blob' })
    return response.data as Blob
  },
  sendEmail: async (proposalId: string, payload: SendEmailPayload): Promise<SendEmailResult> =>
    (await api.post<SendEmailResult>(`/proposals/${proposalId}/send-email/`, payload)).data,
}

export const audioService = {
  extract: async (transcript: string) =>
    (await api.post<{ fields: Partial<RequirementProduct> }>('/audio/extract/', { transcript })).data,
}

export const userService = {
  list: async () => (await api.get<{ results: User[] } | User[]>('/users/')).data,
  create: async (data: Partial<User> & { password?: string }) =>
    (await api.post<User>('/users/', data)).data,
  update: async (id: string, data: Partial<User>) => (await api.patch<User>(`/users/${id}/`, data)).data,
  delete: async (id: string) => api.delete(`/users/${id}/`),
}
