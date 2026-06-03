// ─── Stage definitions ───────────────────────────────────────────────────────

export interface SubStageDef {
  key: string
  display: string
  mandatory: boolean
}

export interface StageDef {
  key: string
  display: string
  index: number
  sub_stages: SubStageDef[]
}

// ─── Project models ───────────────────────────────────────────────────────────

export type ProjectStage =
  | 'new_lead' | 'order_closed' | 'lead_closed' | 'not_responding'
  | 'proposal' | 'costing' | 'sample' | 'order_booked'
  | 'packaging' | 'design' | 'printing' | 'production'
  | 'batch_testing' | 'filling' | 'transit' | 'derma_testing'

export type MilestoneStatus = 'on_track' | 'at_risk' | 'delayed'

export interface StageCompletion {
  id: string
  stage_key: string
  is_complete: boolean
  completed_at: string | null
  completed_by: string | null
  completed_by_name: string | null
}

export interface SubStageCompletion {
  id: string
  stage_key: string
  sub_stage_key: string
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  completed_by_name: string | null
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

export interface CRMProjectList {
  id: string
  project_no: string
  client: string
  client_name: string
  client_company: string
  no_of_products: number | null
  moq: number | null
  manufacturer: string | null
  manufacturer_name: string | null
  designer: string | null
  designer_name: string | null
  packaging_vendor: string | null
  packaging_vendor_name: string | null
  printer: string | null
  printer_name: string | null
  batch_testing_vendor: string | null
  batch_testing_vendor_name: string | null
  derma_testing_vendor: string | null
  derma_testing_vendor_name: string | null
  project_stage: ProjectStage
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
  stage_completions: StageCompletion[]
  sub_stage_completions: SubStageCompletion[]
  notes: ProjectNote[]
  files: ProjectFile[]
  milestones: ProjectMilestone[]
  key_learnings: KeyLearning[]
  stage_definitions: StageDef[]
  delayed_count: number
  at_risk_count: number
}

// ─── Master Data models ───────────────────────────────────────────────────────

export interface Manufacturer {
  id: string
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
  team: 'formulation' | 'sales'
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
