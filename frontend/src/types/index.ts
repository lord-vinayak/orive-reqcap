export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'poc_sales' | 'poc_formulation' | 'poc_ops'
  is_active: boolean
  created_at: string
}

export interface Client {
  phone_no: string
  name: string
  company_name: string
  email: string
  city: string
  gst_details: string
  physical_address: string
  no_of_products: number | null
  planned_selling_price_range: string
  how_many_units_per_product: number | null
  poc: string | null
  poc_name?: string
  lead_status: import('@/constants/clientStatus').LeadStatus
  lead_sub_status: string
  created_at: string
  updated_at: string
}

export interface RequirementProduct {
  id: string
  requirement?: string
  row_number: number
  body_part: string
  category: string
  sub_category: string
  key_benefits: string[]
  size: string
  packaging_type: string
  packaging_notes: string
  planned_mrp: number | null
  specific_ingredient: string
  benchmark_product: string
  has_color: boolean | null
  color_details: string
  has_fragrance: boolean | null
  fragrance_details: string
  created_at?: string
  updated_at?: string
}

export interface Requirement {
  id: string
  client: string
  client_data?: Client
  title: string
  target_audience_age: string
  no_of_products: number | null
  status: 'draft' | 'saved' | 'proposal_ready'
  created_by: string | null
  created_by_name?: string
  products: RequirementProduct[]
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  requirement: string
  text: string
  added_by: string
  added_by_name: string
  created_at: string
}

export interface FileRecord {
  id: string
  requirement: string
  product: string | null
  drive_file_id: string
  drive_url: string
  filename: string
  file_type: 'image' | 'video' | 'document'
  uploaded_by: string
  uploaded_by_name: string
  uploaded_at: string
}

export interface ClientFile {
  id: string
  client: string
  drive_file_id: string
  drive_url: string
  filename: string
  file_type: 'image' | 'video' | 'document'
  uploaded_by: string
  uploaded_by_name: string
  uploaded_at: string
}

export interface CatalogItem {
  id: string
  date: string
  poc: string
  client_name: string
  body_part: string
  product_type: string
  sub_product_type: string
  kb_tag1: string
  kb_tag2: string
  kb_tag3: string
  specific_ingredients: string
  color: string
  fragrance: string
  size: string
  packaging_type: string
  per_kg_rate: number | null
  manufacturing_cost: number | null
  rate_per_unit: number | null
  tentative_packaging_cost: number | null
  label_cost: number | null
  tentative_monocarton_cost: number | null
  total_cost: number | null
  potential_mrp: number | null
  rate_category: string
  is_active: boolean
  uploaded_at: string | null
}

export interface ProposalItem {
  id: string
  proposal: string
  /** Catalog item reference. NULL for freeform rows added from the Product Requirements table. */
  catalog_item: string | null
  /** Read-only merged view of catalog defaults + per-item snapshot overrides. */
  catalog_data: CatalogItem
  /** The editable per-item override layer. Write any catalog field here to override. */
  snapshot?: Partial<CatalogItem>
  sort_order: number
  added_at: string
}

export interface ProposalDocument {
  id: string
  requirement: string
  drive_file_id: string
  drive_url: string
  filename: string
  uploaded_by: string | null
  uploaded_by_name?: string
  uploaded_at: string
}

export interface SentEmail {
  id: string
  proposal: string
  sent_to: string
  subject: string
  sent_by: string | null
  sent_by_name?: string
  sent_at: string
}

export interface Proposal {
  id: string
  requirement: string
  status: 'draft' | 'exported'
  created_by: string | null
  created_by_name?: string
  items: ProposalItem[]
  sent_emails: SentEmail[]
  created_at: string
  updated_at: string
  last_exported_at: string | null
}

export interface BatchRecord {
  id: string
  client_name: string
  brand_name: string
  product_type: string
  product_name: string
  packaging_type: string
  pack_size: string
  moq: number | null
  batch_number: string
  manufacturing_date: string | null
  expiry_date: string | null
  created_at: string
  updated_at: string
}

export interface IngredientRecord {
  id: string
  date: string | null
  category: string
  client_name: string
  vendor_name: string
  product_name: string
  ingredient_use: string
  quantity_sent: string | null
  used_in_batch: string | null
  quantity_remained: string | null
  comment: string
  created_at: string
  updated_at: string
}

export interface PackagingRecord {
  id: string
  date: string | null
  category: string
  client_name: string
  vendor_name: string
  product_name: string
  product_type: string
  no_of_ordered_by_client: string
  quantity_sent: string
  used_in_batch: string
  quantity_remained: string | null
  price_per_unit: string
  damaged_missing: string
  comment: string
  created_at: string
  updated_at: string
}
