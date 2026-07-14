import { api } from './api'
import type {
  CRMProject, CRMProjectList, DashboardStats, PaginatedResponse,
  ProjectNote, ProjectFile, KeyLearning, ProjectMilestone,
  Manufacturer, Vendor, InternalTeamMember, VendorRating,
  VendorProjectPayment, DropdownOption, ProjectPayment, PaymentVendorOption,
  StageStatusResponse, StageCompletion, TaskItem, TaskStatus,
  TaskComment, StandaloneTaskCreate, ResampleNote,
  Invoice, InvoiceCreatePayload, VendorCategory,
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

  getPipelineProjects: (filter: 'formula_pending' | 'sample_in_pipeline') =>
    api.get<CRMProjectList[]>(`/crm/projects/pipeline-projects/?filter=${filter}`),

  getSimilarLearnings: (projectId: string) =>
    api.get<KeyLearning[]>(`/crm/projects/${projectId}/similar-learnings/`),

  // Stage actions
  getStageStatus: (projectId: string) =>
    api.get<StageStatusResponse>(`/crm/projects/${projectId}/stage-status/`),

  completeStage: (projectId: string, stageKey: string, isComplete: boolean) =>
    api.post<StageStatusResponse>(`/crm/projects/${projectId}/complete-stage/`, { stage_key: stageKey, is_complete: isComplete }),

  completeSectionStages: (projectId: string, sectionKey: string) =>
    api.post<StageStatusResponse>(`/crm/projects/${projectId}/complete-section/`, { section_key: sectionKey }),

  approveSample: (projectId: string, approved: boolean | 'other', reason?: string) =>
    api.post<StageStatusResponse>(`/crm/projects/${projectId}/approve-sample/`, {
      approved,
      ...(reason ? { reason } : {}),
    }),

  editResampleNote: (id: string, reason: string) =>
    api.patch<ResampleNote>(`/crm/resample-notes/${id}/`, { reason }),

  deleteResampleNote: (id: string) =>
    api.delete(`/crm/resample-notes/${id}/`),

  setOrderGate: (projectId: string, data: { order_booking_steps: Record<string, boolean>; order_booked: boolean }) =>
    api.post<StageStatusResponse>(`/crm/projects/${projectId}/set-order-gate/`, data),

  resetBatch: (projectId: string) =>
    api.post<StageStatusResponse>(`/crm/projects/${projectId}/reset-batch/`),

  // Task assignment
  assignStage: (projectId: string, stageKey: string, assignedTo: string, opts?: {
    comment?: string
    priority?: string
    planned_closure_date?: string | null
  }) =>
    api.post<TaskItem>(`/crm/projects/${projectId}/assign-stage/`, {
      stage_key: stageKey,
      assigned_to: assignedTo,
      ...(opts?.comment ? { comment: opts.comment } : {}),
      ...(opts?.priority ? { priority: opts.priority } : {}),
      ...(opts?.planned_closure_date !== undefined ? { planned_closure_date: opts.planned_closure_date } : {}),
    }),

  updateTaskStatus: (projectId: string, stageKey: string, taskStatus: TaskStatus) =>
    api.patch<TaskItem>(`/crm/projects/${projectId}/task-status/`, {
      stage_key: stageKey,
      task_status: taskStatus,
    }),

  updateStagePlannedDate: (projectId: string, stageKey: string, plannedClosureDate: string | null) =>
    api.patch<TaskItem>(`/crm/projects/${projectId}/update-planned-date/`, {
      stage_key: stageKey,
      planned_closure_date: plannedClosureDate,
    }),

  updateStandalonePlannedDate: (taskId: string, plannedClosureDate: string | null) =>
    api.patch<TaskItem>(`/crm/standalone-tasks/${taskId}/update-planned-date/`, {
      planned_closure_date: plannedClosureDate,
    }),

  listTasks: () =>
    api.get<PaginatedResponse<TaskItem>>('/crm/tasks/'),

  // Standalone tasks
  listStandaloneTasks: () =>
    api.get<PaginatedResponse<TaskItem>>('/crm/standalone-tasks/'),

  createStandaloneTask: (data: StandaloneTaskCreate) =>
    api.post<TaskItem>('/crm/standalone-tasks/', {
      title: data.title,
      priority: data.priority,
      planned_closure_date: data.planned_closure_date,
      project_input: data.project,
      client_input: data.client,
      assigned_to_input: data.assigned_to,
    }),

  updateStandaloneTask: (id: string, data: Partial<StandaloneTaskCreate> & { task_status?: TaskStatus; actual_closure_date?: string | null }) =>
    api.patch<TaskItem>(`/crm/standalone-tasks/${id}/`, data),

  deleteStandaloneTask: (id: string) =>
    api.delete(`/crm/standalone-tasks/${id}/`),

  // Task comments
  listTaskComments: (params: { stage_task?: string; standalone_task?: string }) =>
    api.get<PaginatedResponse<TaskComment>>('/crm/task-comments/', { params }),

  addTaskComment: (data: { text: string; stage_task?: string; standalone_task?: string }) =>
    api.post<TaskComment>('/crm/task-comments/', data),

  editTaskComment: (id: string, text: string) =>
    api.patch<TaskComment>(`/crm/task-comments/${id}/`, { text }),

  deleteTaskComment: (id: string) =>
    api.delete(`/crm/task-comments/${id}/`),

  allTeamMembers: () =>
    api.get<PaginatedResponse<InternalTeamMember>>('/crm/team-members/'),

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

  uploadStageFile: (projectId: string, stageKey: string, file: File) => {
    const fd = new FormData()
    fd.append('project', projectId)
    fd.append('stage_key', stageKey)
    fd.append('file', file)
    return api.post<ProjectFile>('/crm/project-files/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

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

  allVendorsForPayment: () =>
    api.get<PaymentVendorOption[]>('/crm/manufacturers/all-for-payment/'),

  downloadManufacturerTemplate: () =>
    api.get('/crm/manufacturers/upload-template/', { responseType: 'blob' }),

  bulkUploadManufacturers: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post<{ created: { row: number; company_name: string; vendor_id: string }[]; skipped: { row: number; company_name: string; reason: string }[] }>(
      '/crm/manufacturers/bulk-upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },

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

  downloadVendorTemplate: (vendorType: string) =>
    api.get(`/crm/vendors/upload-template/`, { params: { vendor_type: vendorType }, responseType: 'blob' }),

  bulkUploadVendors: (vendorType: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post<{ created: { row: number; company_name: string; vendor_id: string }[]; skipped: { row: number; company_name: string; reason: string }[] }>(
      '/crm/vendors/bulk-upload/', fd, { params: { vendor_type: vendorType }, headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },

  // Vendor Categories
  listVendorCategories: () =>
    api.get<VendorCategory[]>('/crm/vendor-categories/'),

  createVendorCategory: (data: { name: string }) =>
    api.post<VendorCategory>('/crm/vendor-categories/', data),

  deleteVendorCategory: (id: number) =>
    api.delete(`/crm/vendor-categories/${id}/`),

  // Internal Team
  listTeamMembers: (team?: 'formulation' | 'sales' | 'ops' | 'admin') =>
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

  listProjectPayments_range: (dateFrom: string, dateTo: string) =>
    api.get<PaginatedResponse<ProjectPayment>>('/crm/project-payments/', {
      params: { date_from: dateFrom, date_to: dateTo },
    }),

  listVendorPayments: (kind: 'vendor' | 'manufacturer', entityId: string) =>
    api.get<PaginatedResponse<ProjectPayment>>('/crm/project-payments/', {
      params: kind === 'manufacturer' ? { manufacturer: entityId } : { vendor: entityId },
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

  settleProjectPayment: (id: string, formData: FormData) =>
    api.post<ProjectPayment>(`/crm/project-payments/${id}/settle/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // ─── Invoices ────────────────────────────────────────────────────────────

  listInvoices: (params: { project?: string; client_phone?: string }) =>
    api.get<PaginatedResponse<Invoice>>('/invoices/', { params }),

  createInvoice: (data: InvoiceCreatePayload) =>
    api.post<Invoice>('/invoices/', data),

  previewInvoice: (data: InvoiceCreatePayload) =>
    api.post('/invoices/preview/', data, { responseType: 'blob' }),
}
