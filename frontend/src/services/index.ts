import { api } from './api'
import type {
  Client, Requirement, RequirementProduct, Note, FileRecord,
  CatalogItem, Proposal, ProposalItem, User,
} from '@/types'

export const clientService = {
  list: async (q?: string) => (await api.get<{ results: Client[] } | Client[]>('/clients/', { params: { q } })).data,
  get: async (phone: string) => (await api.get<Client>(`/clients/${phone}/`)).data,
  create: async (data: Partial<Client>) => (await api.post<Client>('/clients/', data)).data,
  update: async (phone: string, data: Partial<Client>) => (await api.put<Client>(`/clients/${phone}/`, data)).data,
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
  delete: async (id: string) => api.delete(`/notes/${id}/`),
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
      // Allow repeated keys: key_benefit[]=Acne&key_benefit[]=Glow
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
}

export const proposalService = {
  getForRequirement: async (reqId: string) =>
    (await api.get<Proposal>(`/requirements/${reqId}/proposal/`)).data,
  addItem: async (proposalId: string, catalogItemId: string) =>
    (await api.post<ProposalItem>(`/proposals/${proposalId}/items/`, { catalog_item: catalogItemId })).data,
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
