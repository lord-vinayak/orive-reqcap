import { api } from './api'
import type {
  Client, Requirement, RequirementProduct, Note, FileRecord,
  CatalogItem, Proposal, ProposalItem, User,
} from '@/types'

export const clientService = {
  list: async (params: { q?: string; poc?: string } = {}) =>
    (await api.get<{ results: Client[] } | Client[]>('/clients/', { params })).data,
  get: async (phone: string) => (await api.get<Client>(`/clients/${phone}/`)).data,
  create: async (data: Partial<Client>) => (await api.post<Client>('/clients/', data)).data,
  update: async (phone: string, data: Partial<Client>) =>
    (await api.put<Client>(`/clients/${phone}/`, data)).data,
}

export const requirementService = {
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
  addItem: async (proposalId: string, catalogItemId: string) => {
    const item = (await api.post<ProposalItem>(`/proposals/${proposalId}/items/`, { catalog_item: catalogItemId })).data
    const defaults = {
      manufacturing_cost: 30.00,
      tentative_packaging_cost: 30.00,
      label_cost: 10.00,
      tentative_monocarton_cost: 15.00,
    }
    return (await api.patch<ProposalItem>(`/proposal-items/${item.id}/`, { snapshot: defaults })).data
  },
  /** Add a freeform (non-catalog) item to a Client Costing — copies snapshot fields directly. */
  addFreeformItem: async (proposalId: string, snapshot: Partial<ProposalItem['catalog_data']>) => {
    const defaults = {
      manufacturing_cost: 30.00,
      tentative_packaging_cost: 30.00,
      label_cost: 10.00,
      tentative_monocarton_cost: 15.00,
    }
    return (await api.post<ProposalItem>(`/proposals/${proposalId}/items/`, { snapshot: { ...defaults, ...snapshot } })).data
  },
  /** Update any snapshot field of an existing Client Costing item. */
  updateItem: async (itemId: string, patch: Partial<ProposalItem['catalog_data']>) =>
    (await api.patch<ProposalItem>(`/proposal-items/${itemId}/`, { snapshot: patch })).data,
  removeItem: async (itemId: string) => api.delete(`/proposal-items/${itemId}/`),
  exportXlsx: async (proposalId: string) => {
    const response = await api.get(`/proposals/${proposalId}/export/`, { responseType: 'blob' })
    return response.data as Blob
  },
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
