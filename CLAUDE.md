# Requirement Capturing Tool — Project Memory

Built for **Skinovation Sciences**. A CRM-style tool for capturing product requirements from clients, building proposals (called "Client Costing" in the UI), and exporting them to Excel.

---

## Tech Stack

### Frontend
- **React 18 + TypeScript + Vite**
- React Router v6, TanStack Query, Zustand (auth store), Axios, React Hook Form
- Tailwind CSS with custom `mustard` colour tokens
- Located at: `frontend/src/`
- Dev server: `npm run dev` (inside `frontend/`)

### Backend
- **Django 5 + Django REST Framework**
- JWT auth via `djangorestframework-simplejwt`
- PostgreSQL (via `psycopg2-binary` + `dj-database-url`)
- Google Drive integration (`google-api-python-client`)
- Audio transcription via `groq`
- Excel export via `openpyxl` + `Pillow`
- Located at: `backend/`
- Dev server: `python manage.py runserver` (activate `.venv` first)
- Settings: `backend/core/settings.py`

---

## Project Structure

```
requirement-tool/
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Home.tsx
│       │   ├── RequirementForm.tsx   ← main form (create/edit)
│       │   ├── RequirementView.tsx   ← read-only view
│       │   ├── RequirementSearch.tsx
│       │   ├── RequirementsLanding.tsx
│       │   ├── Proposal.tsx          ← "Client Costing" page
│       │   ├── AdminCatalog.tsx
│       │   └── AdminUsers.tsx
│       ├── components/
│       │   ├── Layout.tsx            ← navbar + Go Back button
│       │   ├── ProductTable.tsx      ← product requirements table
│       │   ├── KeyBenefitsCell.tsx   ← multi-select popover
│       │   ├── CatalogSuggestions.tsx
│       │   ├── ClientInfoForm.tsx
│       │   ├── NotesSection.tsx
│       │   ├── FileUploadSection.tsx
│       │   └── AudioCaptureButton.tsx
│       ├── services/index.ts         ← all API calls (axios)
│       ├── store/authStore.ts        ← Zustand auth store
│       └── types/index.ts
└── backend/
    └── apps/
        ├── users/         ← custom User model, JWT auth
        ├── clients/       ← Client model with phone validation
        ├── requirements_app/ ← Requirement + RequirementProduct models
        ├── proposals/     ← Proposal + ProposalItem (Client Costing)
        ├── catalog/       ← CatalogItem master data
        ├── notes/         ← append-only notes per requirement
        ├── files/         ← file attachments (Google Drive)
        └── audio/         ← audio recording + Groq transcription
```

---

## Key Domain Concepts

- **Requirement** — a client enquiry with client info, product rows, notes, files, and proposals.
- **Client** — stored separately; a requirement links to a client. Fields: name, phone_no (10 digits), email, location, status.
- **RequirementProduct** — one row in the product table per product requested. Fields include body_part, category, sub_category, key_benefits (array), size, packaging_type, has_color, has_fragrance, packaging_notes, color_details, fragrance_details.
- **Proposal / Client Costing** — one or more proposals per requirement. Each has line items.
- **ProposalItem** — a line item in a proposal. Has an optional `catalog_item` FK and a `snapshot` JSONField. Snapshot stores a copy of catalog fields at creation time; edits update only the snapshot (catalog master is never mutated).
- **CatalogItem** — master product catalog managed by admins.
- **Note** — append-only text notes on a requirement. Auto-mirror notes are prefixed with `[AUTO|rowId|field]`.

---

## Important Conventions

### "Client Costing" vs "Proposal"
- The UI calls it **"Client Costing"** everywhere (labels, headings, buttons).
- The URL, backend models, serializers, and API endpoints all still use **"proposal"**.
- Do NOT rename backend identifiers.

### Snapshot Pattern (ProposalItem)
- When a ProposalItem is created from a CatalogItem, catalog fields are copied into `snapshot`.
- When a ProposalItem is created as freeform (no catalog link), the `snapshot` is set directly.
- `get_catalog_data()` in the serializer merges `CatalogItemSerializer(catalog_item).data` with `item.snapshot` — snapshot fields win.
- Inline edits on the Client Costing page PATCH only the `snapshot` field.

### Auto-Mirror Notes
- When a requirement is saved, `syncAutoNotes()` in `RequirementForm.tsx` creates/updates/deletes notes for `packaging_notes`, `color_details`, and `fragrance_details` across all product rows.
- Auto-notes are identified by the prefix `[AUTO|<rowId>|<fieldName>]`.
- `NotesSection` accepts a `refreshKey` prop (bumped after each save) to trigger a refetch.

### Product Table Validation
- Required fields: `body_part`, `category`, `sub_category`, `key_benefits` (≥1), `size`, `packaging_type`, `has_color`, `has_fragrance`.
- Validation runs via `validateProductRow()` exported from `ProductTable.tsx`.
- Errors shown with `aria-invalid` red borders + `role="alert"` messages per row.
- `showValidation` state in `RequirementForm` controls whether errors are visible.

### Free-text Dropdowns
- All product table selects use `<input list={datalistId} />` + `<datalist>` — free-text is allowed.
- `useId()` hook generates unique datalist IDs per table instance.

### Phone Validation
- Frontend: strips non-digits, caps at 10, save-guard checks `!/^\d{10}$/.test()`.
- Backend: `validate_phone_no` in `clients/serializers.py` uses `re.fullmatch(r'\d{10}', value)`.

### Go Back Button
- `Layout.tsx` uses `useLocation` to detect route.
- `NO_BACK_ROUTES = ["/home", "/login", "/"]` — these pages have no Back button.
- All other pages show `← Go Back` above the page title using `navigate(-1)`.

### XLSX Export
- `backend/apps/proposals/xlsx_export.py`
- Logo (`frontend/public/logo.png`) embedded at cell A1 via `openpyxl` `XlsxImage`.
- `_merged(item)` reads catalog defaults and applies snapshot overrides for each row.

---

## User Roles
- `admin` — full access including delete notes, manage catalog, manage users.
- `poc_sales` — sales point of contact.
- `poc_formulation` — formulation point of contact.

---

## API Base URL
All API calls go through `api/` prefix. Key endpoints:
- `POST /api/auth/login/` — JWT login
- `GET/POST /api/clients/` — client list/create
- `GET/POST /api/requirements/` — requirement list/create
- `GET/POST /api/proposals/` — proposal list/create
- `POST /api/proposals/<id>/items/` — add item (catalog_item or snapshot)
- `PATCH /api/proposal-items/<id>/` — edit item snapshot
- `GET/POST /api/notes/` — notes list/add
- `PATCH /api/notes/<id>/` — update note text
- `GET /api/catalog/items/` — catalog items
- `GET /api/proposals/<id>/export/` — download XLSX

---

## Development Notes
- Backend venv: `backend/.venv`
- Migrations: run `python manage.py migrate` after any model change
- Latest migration of note: `proposals/0004_proposalitem_snapshot` (adds snapshot JSONField, makes catalog_item nullable, removes unique_together, backfills existing rows)
- Frontend aliases: `@/` maps to `frontend/src/`
- Tailwind custom colour: `mustard` (defined in `tailwind.config.js`)
- Dark mode supported throughout via `dark:` Tailwind classes

---

## Sales CRM Module (added 2026-05-30)

Two new Django apps added to the same project:

### `apps/crm_master_data`
- Models: `Manufacturer`, `Vendor` (vendor_type field for 6 types), `InternalTeamMember`, `ManufacturerRating`, `VendorRating`, `VendorProjectPayment`
- All master data: admin-write-only, all-roles-read
- URLs at: `api/crm/manufacturers/`, `api/crm/vendors/`, `api/crm/team-members/`, etc.

### `apps/crm_projects`
- Stage definitions (16 stages) in: `apps/crm_projects/stage_definitions.py` — **source of truth for stage names/sub-stages**
- Models: `CRMProject`, `StageCompletion`, `SubStageCompletion`, `ProjectNote`, `ProjectFile`, `ProjectMilestone`, `KeyLearning`
- Project number auto-generated: `SKI{YYYYMMDD}{CLIENT3}` (e.g. `SKI20260530RAJ`)
- Day 0 = `sample_booked_date` field; milestones auto-calculated using weekday-only logic
- Progress = (completed StageCompletion rows / 16) × 100
- Delay flags: on_track / at_risk (≤2 days) / delayed per ProjectMilestone
- URLs at: `api/crm/projects/`, `api/crm/project-notes/`, `api/crm/project-files/`, etc.

### Frontend CRM pages
- `src/pages/crm/CRMDashboard.tsx` — stats + pipeline + health table
- `src/pages/crm/CRMClientList.tsx` — searchable client list
- `src/pages/crm/CRMClientDetail.tsx` — merged CRM projects + Requirement Tool data + cross-link
- `src/pages/crm/CRMProjectList.tsx` — filterable project list
- `src/pages/crm/CRMProjectDetail.tsx` — 16-stage tracker, notes, milestones, key learnings
- `src/pages/crm/CRMMasterData.tsx` — tabbed master data management

### Frontend CRM components
- `src/components/crm/StagePanel.tsx` — per-stage sub-stage checkboxes + notes + files
- `src/components/crm/MilestoneTable.tsx` — planned vs actual date table with RAG status
- `src/components/crm/ProgressBar.tsx` — ARIA-compliant progress bar
- `src/components/crm/StatusBadge.tsx` — on_track / at_risk / delayed badge

### CRM API service
- `src/services/crm.ts` — all CRM API calls
- `src/types/crm.ts` — all CRM TypeScript types

### Key CRM decisions
- Roles: admin=full, poc_sales=Sales, poc_formulation=Ops; only admin deletes
- File storage: same Google Drive integration as Requirement Tool
- Client page: merged view of CRM projects + Requirements from Requirement Tool
- Key Learnings: similarity matched by same client OR same manufacturer
- Notifications: out of scope v1
- Gantt chart: simplified to milestone table (planned vs actual) for v1
- Bulk Excel upload: templates needed (not yet implemented — v2)
- Project "Create" form page: not yet implemented — needs `src/pages/crm/CRMProjectCreate.tsx`

---

## Client Statuses (updated 2026-06-02)

Old 3 statuses replaced with 8 new ones everywhere (model, frontend constants, UI):
```python
STATUS_CHOICES = [
    ('call_back', 'Call Back'),
    ('catalogue_shared', 'Catalogue Shared'),
    ('costing_shared', 'Costing Shared'),
    ('interested', 'Interested'),
    ('language_barrier', 'Language Barrier'),
    ('not_interested', 'Not Interested'),
    ('not_responding', 'Not Responding after Multiple Attempts'),
    ('unanswered', 'Unanswered'),
]
# default = 'unanswered'
```
- Migration `backend/apps/clients/migrations/0004_client_status_update.py` handles old→new data migration
- Single source of truth: `frontend/src/constants/clientStatus.ts` exports `CLIENT_STATUS_OPTIONS`, `CLIENT_STATUS_LABEL`, `CLIENT_STATUS_COLOR`

---

## Excel Bulk Client Import (added 2026-06-02)

- Route: `/requirements/import` → `src/pages/ClientBulkUpload.tsx`
- Third card on Requirements Landing page
- Backend: `GET /api/clients/upload-template/` (download template), `POST /api/clients/bulk-upload/` (upload)
- Logic: strip `p:+91`, take last 10 digits for phone; skip duplicates + invalid rows (report both); default status `unanswered`; ignore product columns; save email
- Template download available via `clientService.downloadTemplate()`
- Upload via `clientService.bulkUpload(file)` — must pass `headers: { 'Content-Type': 'multipart/form-data' }` to override axios instance default

---

## Number of Products Dropdown

`frontend/src/utils/dropdownOptions.ts` — `PRODUCT_COUNTS` changed from `string[]` to `{ label: string; value: string }[]`:
- Values 1–9 display as-is
- `{ label: '10 and more', value: '10' }` — Excel import uses `10_and_more_` format which maps to `'10'`
- `PRODUCT_COUNT_LABEL: Record<number, string>` for display lookup

---

## Client Costing (Proposal) — Major Overhaul (2026-06-02)

### Column Structure (19 columns in XLSX, 21 in edit table)

**Non-cost editable columns** (body_part, product_type, sub_product_type, kb_tag1, kb_tag2, kb_tag3, specific_ingredients, color, fragrance, size, packaging_type, rate_category):

**Cost columns in order:**
| # | Column | Type | Formula / Notes |
|---|--------|------|-----------------|
| 1 | Raw Material Cost (per kg) | Editable | `per_kg_rate` field — renamed from "Per KG Rate" |
| 2 | Raw Material Cost (per unit) | **Auto-calc** | `(per_kg_rate / 1000) * size` |
| 3 | Manufacturing Cost | Editable | **Default: 20.00** |
| 4 | Estimated Unit Cost | **Auto-calc** | `RM Cost/unit + Mfg Cost` |
| 5 | Tentative Packaging Cost | Editable | **Default: 30.00** |
| 6 | Label Cost | Editable | **Default: 10.00** |
| 7 | Tentative Monocarton Cost | Editable | **Default: 15.00** |
| 8 | Total Cost | **Auto-calc** | `Est. Unit Cost + Pkg + Label + Mono` |
| 9 | Potential MRP | **Auto-calc** | `Total Cost × 6` |

- `rate_per_unit` field removed from UI entirely (still in DB/catalog)
- Auto-calc cells shown with amber background; show `↑ size?` hint when size is missing

### Backend Defaults (proposals/serializers.py)

In `ProposalItemSerializer.create()`:
```python
COST_DEFAULTS = {
    'manufacturing_cost': '20.00',
    'tentative_packaging_cost': '30.00',
    'label_cost': '10.00',
    'tentative_monocarton_cost': '15.00',
}
# Injected FIRST (before catalog loop) so catalog values cannot override them
```
- Catalog loop: `if f not in snapshot` — defaults are pre-set so they're protected
- `per_kg_rate` and `size` from catalog ARE copied to snapshot (not in COST_DEFAULTS, so catalog loop handles them)

### Frontend Service (services/index.ts)

**CRITICAL**: `addItem` is a single POST — no PATCH after. The old code had a redundant PATCH with wrong `manufacturing_cost: 30.00` that overrode backend defaults. Now:
```typescript
addItem: (proposalId, catalogItemId) =>
  api.post(`/proposals/${proposalId}/items/`, { catalog_item: catalogItemId })
addFreeformItem: (proposalId, snapshot) =>
  api.post(`/proposals/${proposalId}/items/`, { snapshot })
```

### Proposal.tsx Layout

- Edit tab: **stacked layout** (top pane = catalog search, bottom pane = editable table — both full width)
- Catalog search shows max 10 results; "Showing 10 of N — refine filters" hint when more
- Filter bar: `flex flex-wrap` with `text-sm h-9 px-2` on all controls for consistent sizing
- Edit table: `text-sm` (was `text-xs`)
- `TABLE_COLUMNS: ColSpec[]` — union type `{ kind: 'edit' | 'calc', key, label, numeric? }`
- `computedCosts(data)` — pure function, takes `Record<string, unknown>`, returns `{ rawPerUnit, estUnit, total, mrp }`
- `getMerged(it)` — spreads `catalog_data` + `draft[it.id]` so derived cells update live as user types
- `fmt(val)` — locale-formatted with 2dp; returns `—` only for null/undefined (not 0)
- `fmtCalc(val)` — same format for derived cells

### XLSX Export (xlsx_export.py)

- Banner rows (`SKINOVATION SCIENCES`, `Client Costing`) now merged dynamically: `get_column_letter(len(columns))` so they always span full table width
- `_compute_costs(m)` helper calculates the 4 derived columns server-side for XLSX
- Column widths array updated for 19 columns: `[14, 16, 18, 26, 32, 12, 12, 10, 14, 14, 22, 22, 18, 20, 22, 14, 22, 14, 14]`

---

## CRM Bug Fixes (2026-06-02)

- **CRMClientDetail**: Requirements filter fixed — `{ client: phone }` → `{ client_phone: phone }`
- **RequirementSearch**: Auto-fills phone from URL param `?phone=` via `useSearchParams`
- **RequirementForm**: Pre-fills client when navigated from `?client=PHONE`; "New Requirement" button added in RequirementSearch expanded rows
- **Stage ordering**: Backend auto-completes stages before `project_stage` on create; frontend `isStageLocked()` prevents editing future stages
- **Mini progress bar**: Fixed to show partial fill based on completed sub-stages ratio
- **Sample Booked Date**: Editable in `ProjectInfoPanel` on `CRMProjectDetail` page

---

## Key Architectural Patterns

### Snapshot + catalog_data merge (proposals)
```
catalog_data = merge(CatalogItemSerializer(catalog_item).data, snapshot)
# snapshot wins on any key where v is not None and v != ''
```
- Frontend reads `catalog_data` exclusively (never raw snapshot)
- Edits PATCH only the `snapshot` field via `updateItem(itemId, { field: value })`
- `getMerged(it)` in `EditableItemsTable` overlays draft state on top for live computation

### Axios Content-Type for file uploads
Axios instance sets `Content-Type: application/json` by default. Override per-request:
```typescript
api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
```
Without this, Django's `MultiPartParser` won't run and `request.FILES` is empty.

### TypeScript cast for CatalogItem → Record
```typescript
it.catalog_data as unknown as Record<string, unknown>
// Direct cast fails — must go through `unknown` first
```
