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
