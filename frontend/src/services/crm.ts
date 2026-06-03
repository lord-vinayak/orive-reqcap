import { api } from './api'
import type {
  CRMProject, CRMProjectList, DashboardStats, PaginatedResponse,
  ProjectNote, ProjectFile, KeyLearning, ProjectMilestone,
  Manufacturer, Vendor, InternalTeamMember, VendorRating,
  VendorProjectPayment, DropdownOption, ProjectPayment,
} from '@/types/crm'

// ─── Projects ────────────────────────────────────────────────────────────────

export const crmApi = {
  // Projects
  listProjects: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<CRMProjectList>>('/crm/projects/', { params }),

  getProject: (id: string) =>
    api.get<CRMProject>(`/crm/projects/${id}/`),

  createProject: (data: {
    client: string
    no_of_products?: number
    moq?: number
    manufacturer?: string
    project_stage?: string
    sales_poc?: string
    formulation_poc?: string
    sample_booked_date?: string
  }) => api.post<CRMProject>('/crm/projects/', data),

  updateProject: (id: string, data: Partial<CRMProject>) =>
    api.patch<CRMProject>(`/crm/projects/${id}/`, data),

  deleteProject: (id: string) =>
    api.delete(`/crm/projects/${id}/`),

  getDashboardStats: () =>
    api.get<DashboardStats>('/crm/projects/dashboard_stats/'),

  getHealthTable: () =>
    api.get<CRMProjectList[]>('/crm/projects/health_table/'),

  getSimilarLearnings: (projectId: string) =>
    api.get<KeyLearning[]>(`/crm/projects/${projectId}/similar-learnings/`),

  toggleSubStage: (projectId: string, stageKey: string, subStageKey: string, completed: boolean) =>
    api.post(`/crm/projects/${projectId}/toggle-sub-stage/`, { stage_key: stageKey, sub_stage_key: subStageKey, completed }),

  completeStage: (projectId: string, stageKey: string, isComplete: boolean) =>
    api.post(`/crm/projects/${projectId}/complete-stage/`, { stage_key: stageKey, is_complete: isComplete }),

  // Notes (append-only)
  listNotes: (projectId: string, stageKey?: string) =>
    api.get<PaginatedResponse<ProjectNote>>('/crm/project-notes/', {
      params: { project: projectId, ...(stageKey ? { stage_key: stageKey } : {}) },
    }),

  addNote: (data: { project: string; stage_key?: string; sub_stage_key?: string; text: string }) =>
    api.post<ProjectNote>('/crm/project-notes/', data),

  // Files
  listFiles: (projectId: string, stageKey?: string) =>
    api.get<PaginatedResponse<ProjectFile>>('/crm/project-files/', {
      params: { project: projectId, ...(stageKey ? { stage_key: stageKey } : {}) },
    }),

  addFile: (data: {
    project: string; stage_key?: string; sub_stage_key?: string
    drive_file_id: string; drive_url: string; filename: string; file_type: string
  }) => api.post<ProjectFile>('/crm/project-files/', data),

  deleteFile: (id: string) =>
    api.delete(`/crm/project-files/${id}/`),

  // Key Learnings
  listKeyLearnings: (projectId: string) =>
    api.get<PaginatedResponse<KeyLearning>>('/crm/key-learnings/', { params: { project: projectId } }),

  addKeyLearning: (data: { project: string; text: string; tags?: string[] }) =>
    api.post<KeyLearning>('/crm/key-learnings/', data),

  updateKeyLearning: (id: string, data: Partial<KeyLearning>) =>
    api.patch<KeyLearning>(`/crm/key-learnings/${id}/`, data),

  deleteKeyLearning: (id: string) =>
    api.delete(`/crm/key-learnings/${id}/`),

  // Milestones
  listMilestones: (projectId: string) =>
    api.get<PaginatedResponse<ProjectMilestone>>('/crm/project-milestones/', { params: { project: projectId } }),

  updateMilestoneActualDate: (id: string, actualDate: string) =>
    api.patch<ProjectMilestone>(`/crm/project-milestones/${id}/`, { actual_date: actualDate }),

  // ─── Master Data ─────────────────────────────────────────────────────────

  // Manufacturers
  listManufacturers: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Manufacturer>>('/crm/manufacturers/', { params }),

  getManufacturer: (id: string) =>
    api.get<Manufacturer>(`/crm/manufacturers/${id}/`),

  createManufacturer: (data: Partial<Manufacturer>) =>
    api.post<Manufacturer>('/crm/manufacturers/', data),

  updateManufacturer: (id: string, data: Partial<Manufacturer>) =>
    api.patch<Manufacturer>(`/crm/manufacturers/${id}/`, data),

  deleteManufacturer: (id: string) =>
    api.delete(`/crm/manufacturers/${id}/`),

  manufacturerDropdown: () =>
    api.get<DropdownOption[]>('/crm/manufacturers/dropdown/'),

  // Vendors
  listVendors: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Vendor>>('/crm/vendors/', { params }),

  createVendor: (data: Partial<Vendor>) =>
    api.post<Vendor>('/crm/vendors/', data),

  updateVendor: (id: string, data: Partial<Vendor>) =>
    api.patch<Vendor>(`/crm/vendors/${id}/`, data),

  deleteVendor: (id: string) =>
    api.delete(`/crm/vendors/${id}/`),

  vendorDropdown: (vendorType: string) =>
    api.get<DropdownOption[]>('/crm/vendors/dropdown/', { params: { vendor_type: vendorType } }),

  // Internal Team
  listTeamMembers: (team?: 'formulation' | 'sales') =>
    api.get<PaginatedResponse<InternalTeamMember>>('/crm/team-members/', {
      params: team ? { team } : {},
    }),

  createTeamMember: (data: Partial<InternalTeamMember>) =>
    api.post<InternalTeamMember>('/crm/team-members/', data),

  updateTeamMember: (id: string, data: Partial<InternalTeamMember>) =>
    api.patch<InternalTeamMember>(`/crm/team-members/${id}/`, data),

  deleteTeamMember: (id: string) =>
    api.delete(`/crm/team-members/${id}/`),

  // Ratings
  addManufacturerRating: (data: { manufacturer: string; project: string; rating: number; comment?: string }) =>
    api.post('/crm/manufacturer-ratings/', data),

  addVendorRating: (data: { vendor: string; project: string; rating: number; comment?: string }) =>
    api.post<VendorRating>('/crm/vendor-ratings/', data),

  // Vendor payments (legacy)
  listPayments: (projectId?: string) =>
    api.get<PaginatedResponse<VendorProjectPayment>>('/crm/vendor-payments/', {
      params: projectId ? { project: projectId } : {},
    }),

  createPayment: (data: Partial<VendorProjectPayment>) =>
    api.post<VendorProjectPayment>('/crm/vendor-payments/', data),

  updatePayment: (id: string, data: Partial<VendorProjectPayment>) =>
    api.patch<VendorProjectPayment>(`/crm/vendor-payments/${id}/`, data),

  deletePayment: (id: string) =>
    api.delete(`/crm/vendor-payments/${id}/`),

  // Project cash-flow payments
  listProjectPayments: (projectId: string) =>
    api.get<PaginatedResponse<ProjectPayment>>('/crm/project-payments/', {
      params: { project: projectId },
    }),

  createProjectPayment: (formData: FormData) =>
    api.post<ProjectPayment>('/crm/project-payments/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateProjectPayment: (id: string, formData: FormData) =>
    api.patch<ProjectPayment>(`/crm/project-payments/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteProjectPayment: (id: string) =>
    api.delete(`/crm/project-payments/${id}/`),
}
