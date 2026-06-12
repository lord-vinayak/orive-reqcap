// ─── Project phase / stage types ─────────────────────────────────────────────

export type ProjectPhase = 'sample' | 'order'

export type MilestoneStatus = 'on_track' | 'at_risk' | 'delayed'

export interface StageCompletion {
  id: string
  stage_key: string
  is_complete: boolean
  completed_at: string | null
  completed_by: string | null
  completed_by_name: string | null
}

// ─── Stage status (returned by /stage-status/ endpoint) ──────────────────────

export type TaskStatus = 'not_started' | 'wip' | 'pending' | 'closed'
export type TaskPriority = 'high' | 'medium' | 'low'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  wip: 'WIP',
  pending: 'Pending',
  closed: 'Closed',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export interface TaskComment {
  id: string
  stage_task: string | null
  standalone_task: string | null
  text: string
  author: string | null
  author_name: string | null
  author_email: string | null
  created_at: string
  updated_at: string
  edited: boolean
}

export interface LatestComment {
  id: string
  text: string
  author_name: string | null
  created_at: string
  edited: boolean
}

export interface TaskItem {
  id: string
  task_type: 'stage' | 'standalone'
  // stage-task fields (null for standalone)
  stage_key: string | null
  stage_display: string | null
  // standalone-task field
  title: string
  project_id: string | null
  project_no: string | null
  client_name: string | null
  client_phone: string | null
  client_lead_status: string | null
  client_lead_sub_status: string | null
  assigned_to_id: string | null
  assigned_to_name: string | null
  assigned_to_user_id: string | null
  assigned_by_user_id: string | null
  assigned_at: string | null
  priority: TaskPriority
  planned_closure_date: string | null
  actual_closure_date: string | null
  task_status: TaskStatus
  task_status_display: string
  last_updated_at: string | null
  last_updated_by_name: string | null
  latest_comment: LatestComment | null
}

export interface StandaloneTaskCreate {
  title: string
  project?: string | null       // project UUID
  client?: string | null        // client phone_no
  assigned_to?: string | null   // InternalTeamMember UUID
  priority?: TaskPriority
  planned_closure_date?: string | null
}

export interface StageStatusItem {
  key: string
  display: string
  is_complete: boolean
  is_locked: boolean
  is_approval_gate?: boolean
  completed_at: string | null
  completed_by_name: string | null
  assigned_to_id?: string | null
  assigned_to_name?: string | null
  task_status?: TaskStatus
}

export interface LoopCycle {
  cycle: number
  is_active: boolean
  stages: StageStatusItem[]
}

export interface SectionStatus {
  key: string
  display: string
  is_locked: boolean
  is_section_complete: boolean
  stages: StageStatusItem[]
}

export interface ResampleNote {
  id: string
  cycle_from: number
  reason: string
  author_name: string | null
  created_at: string
  updated_at: string
}

export interface StageStatusResponse {
  phase: ProjectPhase
  resample_cycle: number
  max_cycles: number
  order_advance_received: boolean
  order_booked: boolean
  sample_phase_complete: boolean
  resample_notes: Record<string, ResampleNote>  // keyed by cycle_from as string
  sample_phase: {
    pre_loop: StageStatusItem[]
    loop_cycles: LoopCycle[]
    post_approval: StageStatusItem[]
    show_post_approval: boolean
  }
  order_phase: {
    locked: boolean
    sections: SectionStatus[]
  }
  progress: {
    sample_done: number
    sample_total: number
    order_done: number
    order_total: number
    overall_pct: number
  }
}

export interface ProjectNote {
  id: string
  project: string
  stage_key: string
  sub_stage_key: string
  text: string
  added_by: string | null
  added_by_name: string | null
  added_by_email: string | null
  created_at: string
}

export interface ProjectFile {
  id: string
  project: string
  stage_key: string
  sub_stage_key: string
  drive_file_id: string
  drive_url: string
  filename: string
  file_type: 'image' | 'video' | 'document'
  uploaded_by: string | null
  uploaded_by_name: string | null
  uploaded_at: string
}

export interface ProjectMilestone {
  id: string
  milestone_key: string
  milestone_display: string
  planned_date: string
  actual_date: string | null
  status: MilestoneStatus
}

export interface KeyLearning {
  id: string
  project: string
  text: string
  tags: string[]
  created_by: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export interface NextMilestone {
  key: string
  display: string
  planned_date: string
}

export interface VendorMini {
  id: string
  vendor_id: string
  company_name: string
  city: string
}

export interface CRMProjectList {
  id: string
  project_no: string
  client: string
  client_name: string
  client_company: string
  client_phone: string
  client_lead_status: string
  client_lead_sub_status: string
  no_of_products: number | null
  moq: number | null
  phase: ProjectPhase
  project_stage: string
  manufacturers: VendorMini[]
  designers: VendorMini[]
  packaging_vendors: VendorMini[]
  printers: VendorMini[]
  batch_testing_vendors: VendorMini[]
  derma_testing_vendors: VendorMini[]
  sales_poc: string | null
  sales_poc_name: string | null
  formulation_poc: string | null
  formulation_poc_name: string | null
  sample_booked_date: string | null
  start_date: string
  created_at: string
  progress_percentage: number
  has_delays: boolean
  next_milestone: NextMilestone | null
}

export interface CRMProject extends CRMProjectList {
  resample_cycle: number
  order_advance_received: boolean
  order_booked: boolean
  stage_completions: StageCompletion[]
  notes: ProjectNote[]
  files: ProjectFile[]
  milestones: ProjectMilestone[]
  key_learnings: KeyLearning[]
  delayed_count: number
  at_risk_count: number
}

// ─── Master Data models ───────────────────────────────────────────────────────

export interface Manufacturer {
  id: string
  vendor_id: string
  company_name: string
  poc_name: string
  phone_no: string
  email: string
  city: string
  state: string
  address: string
  us_fda: boolean
  cosmetic_fda: boolean
  ayush: boolean
  iso: boolean
  gst_certified: boolean
  gmp: boolean
  stability_chamber: boolean
  bank_account_no: string
  bank_ifsc: string
  bank_name: string
  pan_no: string
  gst_no: string
  notes: string
  average_rating: number | null
  created_at: string
  updated_at: string
}

export type VendorType = 'packaging' | 'printing' | 'testing' | 'designer' | 'ecommerce' | 'logistics'

export interface Vendor {
  id: string
  vendor_id: string
  vendor_type: VendorType
  company_name: string
  poc_name: string
  phone_no: string
  email: string
  city: string
  bank_account_no: string
  bank_ifsc: string
  bank_name: string
  pan_no: string
  gst_no: string
  notes: string
  average_rating: number | null
  created_at: string
  updated_at: string
}

export interface InternalTeamMember {
  id: string
  team: 'formulation' | 'sales' | 'ops'
  name: string
  email: string
  phone_no: string
  user: string | null
  user_email: string | null
  created_at: string
  updated_at: string
}

export interface VendorRating {
  id: string
  vendor: string
  project: string
  rating: number
  comment: string
  rated_by: string | null
  rated_by_name: string | null
  created_at: string
}

export interface VendorProjectPayment {
  id: string
  project: string
  manufacturer: string | null
  vendor: string | null
  invoice_amount: string
  paid_amount: string
  payment_date: string | null
  payment_status: 'pending' | 'partial' | 'paid'
  notes: string
  created_at: string
  updated_at: string
}

// ─── Project Payments ────────────────────────────────────────────────────────

export type PaymentDirection = 'paid' | 'received' | 'payable' | 'receivable'

export type PaidSubType = 'manufacturing' | 'logistics' | 'derma_testing' | 'batch_testing' | 'packaging' | 'printing' | 'samples' | 'others'
export type ReceivedSubType = 'sample' | 'production' | 'design' | 'packaging' | 'printing' | 'logistics' | 'testing' | 'others'
export type PaymentSubType = PaidSubType | ReceivedSubType

export interface PaymentVendorOption {
  id: string
  vendor_id: string
  company_name: string
  city: string
  kind: 'manufacturer' | 'vendor'
  vendor_type?: string
}

export interface ProjectPayment {
  id: string
  project: string
  project_no: string
  project_client_name: string
  payment_date: string
  direction: PaymentDirection
  sub_type: PaymentSubType
  sub_type_display: string
  amount: string
  vendor: string | null
  vendor_name: string | null
  vendor_vid: string | null
  manufacturer: string | null
  manufacturer_name: string | null
  manufacturer_vid: string | null
  settlement: string | null
  is_settled: boolean
  comments: string
  invoice_drive_id: string
  invoice_drive_url: string
  invoice_filename: string
  created_by: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
}

// ─── Dashboard types ──────────────────────────────────────────────────────────

export interface DashboardStats {
  stage_distribution: Record<string, number>
  total_projects: number
  delayed_projects: number
  pipeline: {
    proposal: number
    sample_in_pipeline: number
    packaging: number
  }
}

// ─── Dropdown option ─────────────────────────────────────────────────────────

export interface DropdownOption {
  id: string
  vendor_id?: string
  company_name: string
  city: string
}

// ─── API paginated response ───────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
