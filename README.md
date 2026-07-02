# Skinovation Sciences — Requirement Capturing & CRM Tool

A full-stack web application for capturing client product requirements, building proposals (Client Costing), tracking projects through a 16-stage pipeline, and exporting data to Excel — built exclusively for **Skinovation Sciences**.

- **Frontend:** React 18 + Vite + TypeScript + Tailwind (hosted on Vercel)
- **Backend:** Django 5 + DRF, Dockerized (hosted on Railway)
- **Database:** PostgreSQL on Supabase
- **File storage:** Google Drive (owner account with service account fallback)
- **Audio:** Web Speech API (Chrome) → Groq LLM + keyword matching
- **Theme:** White / Black / Mustard, Aptos font

---

## Table of Contents

1. [Key Features](#key-features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Getting Started](#getting-started)
6. [Architecture Overview](#architecture-overview)
7. [Environment Variables](#environment-variables)
8. [Available Scripts](#available-scripts)
9. [API Reference](#api-reference)
10. [Deployment](#deployment)
11. [User Roles](#user-roles)
12. [Troubleshooting](#troubleshooting)
13. [Feature Status](#feature-status)

---

## Key Features

### Requirement Capturing Tool
- Capture client product requirements with cascading dropdowns (body part → category → sub-category → key benefits)
- Auto-save every 3 seconds with local draft recovery on page reload
- Append-only notes with author + timestamp
- File upload directly to Google Drive (`/<client>/<date>/`)
- Audio capture (Chrome) transcribed via Groq LLM with keyword matching
- Free-text dropdowns (all product table selects allow custom values)

### Client Costing (Proposals)
- Multi-proposal support per requirement
- 19-column XLSX export with logo, client info, and auto-calculated cost columns
- Snapshot pattern: edits never mutate the master catalog; each item stores its own copy
- Auto-calculated columns: Raw Material Cost/unit, Estimated Unit Cost, Total Cost, Potential MRP
- Smart defaults: Manufacturing Cost (₹20), Packaging (₹30), Label (₹10), Monocarton (₹15)

### Client Management
- Search clients by phone, name, or email
- 8 status types: Call Back, Catalogue Shared, Costing Shared, Interested, Language Barrier, Not Interested, Not Responding, Unanswered
- Excel bulk import: strips `+91`, deduplicates, skips invalid rows, reports results
- Download blank import template

### Sales CRM Module
- 16-stage project pipeline (from Sample Booking to Market Launch)
- Auto-stage locking: prevents editing future stages; auto-completes all prior stages on project create
- Weekday-only milestone calculations from Day 0 (sample booked date)
- RAG delay flags: On Track / At Risk (≤2 days) / Delayed
- Key Learnings: similarity-matched by same client or same manufacturer
- Master data management: Manufacturers, Vendors (6 types), Internal Team Members
- CRM Dashboard: pipeline stats, health table, project progress

### Admin Tools
- User management (create/deactivate users)
- Catalog management: import from Excel, edit items inline
- Role-based access control (admin / poc_sales / poc_formulation)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, React Router v6 |
| **State** | TanStack Query (server state), Zustand (auth) |
| **Forms** | React Hook Form |
| **Styling** | Tailwind CSS with custom `mustard` tokens, dark mode |
| **Backend** | Django 5, Django REST Framework |
| **Auth** | JWT via `djangorestframework-simplejwt` + Google OAuth |
| **Database** | PostgreSQL (Supabase) via `psycopg2-binary` + `dj-database-url` |
| **File Storage** | Google Drive API (`google-api-python-client`) |
| **Audio** | Groq API (llama-3.1-8b-instant) |
| **Excel Export** | `openpyxl` + `Pillow` |
| **Hosting** | Vercel (frontend), Railway (backend, Dockerized) |

---

## Project Structure

```
requirement-tool/
├── backend/
│   ├── core/                      # Django settings, root URLs, WSGI
│   ├── apps/
│   │   ├── users/                 # Custom User model, JWT auth, Google OAuth
│   │   ├── clients/               # Client model, phone validation, bulk import
│   │   ├── requirements_app/      # Requirement + RequirementProduct models
│   │   ├── proposals/             # Proposal + ProposalItem, snapshot pattern, XLSX export
│   │   ├── catalog/               # CatalogItem master data
│   │   ├── notes/                 # Append-only notes per requirement
│   │   ├── files/                 # File attachments via Google Drive
│   │   ├── audio/                 # Audio recording + Groq transcription
│   │   ├── crm_master_data/       # Manufacturer, Vendor, InternalTeamMember, Ratings
│   │   └── crm_projects/          # CRMProject, StageCompletion, Milestones, Key Learnings
│   ├── scripts/
│   │   └── seed_catalog.py        # One-time Excel → catalog import
│   ├── Dockerfile
│   ├── railway.json
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/
        │   ├── Login.tsx
        │   ├── Home.tsx
        │   ├── RequirementForm.tsx        # Main requirement create/edit form
        │   ├── RequirementView.tsx        # Read-only requirement view
        │   ├── RequirementSearch.tsx      # Search requirements; auto-fills phone from URL
        │   ├── RequirementsLanding.tsx    # Landing: new / search / bulk import
        │   ├── RequirementsAdd.tsx
        │   ├── Proposal.tsx               # "Client Costing" page (3 tabs: edit/preview/export)
        │   ├── ClientBulkUpload.tsx       # Excel bulk client import
        │   ├── AdminCatalog.tsx
        │   ├── AdminUsers.tsx
        │   └── crm/
        │       ├── CRMDashboard.tsx       # Stats, pipeline, health table
        │       ├── CRMClientList.tsx      # Searchable CRM client list
        │       ├── CRMClientDetail.tsx    # Merged CRM + Requirement Tool data per client
        │       ├── CRMProjectList.tsx     # Filterable project list
        │       ├── CRMProjectDetail.tsx   # 16-stage tracker, notes, milestones, learnings
        │       ├── CRMProjectCreate.tsx   # New project form
        │       ├── CRMClientCreate.tsx    # New CRM client form
        │       ├── CRMFinancials.tsx      # Financials view
        │       ├── CRMMasterData.tsx      # Tabbed master data management
        │       └── TaskTracker.tsx
        ├── components/
        │   ├── Layout.tsx                 # Navbar + Go Back button
        │   ├── ProductTable.tsx           # Product requirements table with validation
        │   ├── KeyBenefitsCell.tsx        # Multi-select popover
        │   ├── CatalogSuggestions.tsx
        │   ├── ClientInfoForm.tsx
        │   ├── NotesSection.tsx
        │   ├── FileUploadSection.tsx
        │   ├── AudioCaptureButton.tsx
        │   └── crm/
        │       ├── StagePanel.tsx         # Per-stage sub-stage checkboxes + notes + files
        │       ├── MilestoneTable.tsx     # Planned vs actual date table with RAG status
        │       ├── ProgressBar.tsx        # ARIA-compliant progress bar
        │       └── StatusBadge.tsx        # on_track / at_risk / delayed badge
        ├── services/
        │   ├── index.ts                   # All requirement-tool API calls (axios)
        │   └── crm.ts                     # All CRM API calls
        ├── types/
        │   ├── index.ts                   # Requirement tool TypeScript types
        │   └── crm.ts                     # CRM TypeScript types
        ├── constants/
        │   └── clientStatus.ts            # CLIENT_STATUS_OPTIONS, LABEL, COLOR
        ├── store/
        │   └── authStore.ts               # Zustand auth store
        └── utils/
            └── dropdownOptions.ts         # PRODUCT_COUNTS, PRODUCT_COUNT_LABEL
```

---

## Prerequisites

- **Python 3.11+** (with `venv`)
- **Node.js 18+** and `npm`
- **PostgreSQL** (or a Supabase project)
- **Google Cloud project** (OAuth + Drive)
- **Groq account** (free, for audio transcription)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone <repo-url>
cd requirement-tool
```

### 2. Backend — Local Development

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with real values — see Environment Variables section below

# Run database migrations
python manage.py migrate

# Create the first admin user (reads INITIAL_ADMIN_* from .env)
python manage.py bootstrap_admin

# (Optional) Connect the Google Drive owner account
python manage.py connect_drive_owner

# (Optional) Seed the product catalog from Excel
python scripts/seed_catalog.py "path/to/catalog.xlsx"

# Start the dev server
python manage.py runserver 0.0.0.0:8000
```

Backend runs at **http://localhost:8000**

### 3. Frontend — Local Development

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:8000 and VITE_GOOGLE_CLIENT_ID

npm run dev
```

Frontend runs at **http://localhost:5173**

### 4. First Login

1. Open http://localhost:5173
2. Log in with the `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` from your `.env`
3. Go to **Users** (top-right menu) to create team accounts
4. Go to **Catalog** to import the product catalog from Excel

---

## Architecture Overview

### Domain Concepts

| Concept | Description |
|---|---|
| **Requirement** | A client enquiry. Has client info, product rows, notes, files, and proposals. |
| **Client** | Stored separately; linked to requirements via phone number. |
| **RequirementProduct** | One product row per requirement. Stores body part, category, sub-category, key benefits, size, packaging, etc. |
| **Proposal / Client Costing** | One or more proposals per requirement. Contains line items. |
| **ProposalItem** | A line item with an optional `catalog_item` FK and a `snapshot` JSONField. The snapshot is the source of truth for edits — catalog is never mutated. |
| **CatalogItem** | Master product catalog managed by admins. |
| **Note** | Append-only text on a requirement. Auto-mirror notes are prefixed `[AUTO\|rowId\|field]`. |
| **CRMProject** | A tracked project with 16 stages, milestones, notes, files, and key learnings. |

### Snapshot Pattern (ProposalItem)

```
On create from catalog:
  snapshot = copy of catalog fields

On freeform create:
  snapshot = directly set values

get_catalog_data() = merge(CatalogItemSerializer(catalog_item).data, snapshot)
  # snapshot fields win on any non-null/non-empty key

On inline edit:
  PATCH /api/proposal-items/<id>/  →  { snapshot: { field: value } }
  # Only snapshot is mutated; catalog master is never touched
```

### Auto-Mirror Notes

`syncAutoNotes()` in `RequirementForm.tsx` automatically creates/updates/deletes notes for `packaging_notes`, `color_details`, and `fragrance_details` when a requirement is saved. Notes are identified by the prefix `[AUTO|<rowId>|<fieldName>]`.

### CRM Stage Logic

- 16 stages defined in `apps/crm_projects/stage_definitions.py` (source of truth)
- Project number auto-generated: `SKI{YYYYMMDD}{CLIENT3}` (e.g. `SKI20260530RAJ`)
- Day 0 = `sample_booked_date`; all milestones calculated using weekday-only arithmetic
- `isStageLocked()` in frontend prevents editing stages beyond the current project stage
- On project create, all stages prior to `project_stage` are auto-completed

### Cost Calculation (Client Costing)

| Column | Type | Formula |
|---|---|---|
| Raw Material Cost (per kg) | Editable | `per_kg_rate` field |
| Raw Material Cost (per unit) | Auto-calc | `(per_kg_rate / 1000) × size` |
| Manufacturing Cost | Editable | Default: ₹20.00 |
| Estimated Unit Cost | Auto-calc | RM Cost/unit + Mfg Cost |
| Tentative Packaging Cost | Editable | Default: ₹30.00 |
| Label Cost | Editable | Default: ₹10.00 |
| Tentative Monocarton Cost | Editable | Default: ₹15.00 |
| Total Cost | Auto-calc | Est. Unit Cost + Pkg + Label + Mono |
| Potential MRP | Auto-calc | Total Cost × 6 |

### Client Status Values

```
call_back            → Call Back
catalogue_shared     → Catalogue Shared
costing_shared       → Costing Shared
interested           → Interested
language_barrier     → Language Barrier
not_interested       → Not Interested
not_responding       → Not Responding after Multiple Attempts
unanswered           → Unanswered  (default)
```

Single source of truth: `frontend/src/constants/clientStatus.ts`

---

## Environment Variables

### `backend/.env`

```env
# Django core
SECRET_KEY=                         # 50+ char random string: python -c "import secrets; print(secrets.token_urlsafe(50))"
DEBUG=True                          # False in production
ALLOWED_HOSTS=localhost,127.0.0.1,.railway.app

# Database (Supabase → Project Settings → Database → Connection string → URI)
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app

# Google OAuth (Sign in with Google)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Google Drive — preferred: owner account upload
# Generate with: python manage.py connect_drive_owner
GOOGLE_DRIVE_REFRESH_TOKEN=
GOOGLE_DRIVE_ROOT_FOLDER_ID=       # Folder ID from Drive URL

# Google Drive — fallback: service account (requires Google Workspace Shared Drive)
GOOGLE_DRIVE_CREDENTIALS_JSON={"type":"service_account",...}
GOOGLE_DRIVE_CREDENTIALS_FILE=     # Absolute path to JSON file (local dev only)

# Groq (audio transcription — free key from console.groq.com)
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant

# JWT
JWT_SIGNING_KEY=                   # Another long random string

# Default password for new users created by admin
DEFAULT_NEW_USER_PASSWORD=ChangeMe123!

# Initial admin user (auto-created on first run by bootstrap_admin)
INITIAL_ADMIN_EMAIL=admin@skinovationsciences.com
INITIAL_ADMIN_PASSWORD=ChangeMe123!
INITIAL_ADMIN_NAME=Admin User
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=             # Must match GOOGLE_CLIENT_ID in backend
```

### Quick Setup Checklist

- [ ] Supabase connection URL (Database tab → Connection string → URI)
- [ ] Google Cloud OAuth Client ID + Secret
- [ ] Google Drive owner refresh token (`python manage.py connect_drive_owner`)
- [ ] Google Drive folder ID (from folder URL)
- [ ] Groq API key (free, from console.groq.com)
- [ ] Initial admin email + password
- [ ] Vercel domain → add to `CORS_ALLOWED_ORIGINS`
- [ ] Railway domain → set as `VITE_API_URL`

---

## Available Scripts

### Backend

| Command | Description |
|---|---|
| `python manage.py runserver` | Start dev server on port 8000 |
| `python manage.py migrate` | Apply pending database migrations |
| `python manage.py makemigrations` | Generate new migration files |
| `python manage.py bootstrap_admin` | Create initial admin from env vars |
| `python manage.py connect_drive_owner` | OAuth flow to get Drive refresh token |
| `python scripts/seed_catalog.py <file.xlsx>` | Import catalog from Excel |

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server on port 5173 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login/` | JWT login (email + password) |
| `POST` | `/api/auth/google/` | Google OAuth login |
| `POST` | `/api/auth/refresh/` | Refresh JWT token |

### Clients
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/clients/` | List/search clients |
| `POST` | `/api/clients/` | Create client |
| `GET` | `/api/clients/upload-template/` | Download blank import Excel |
| `POST` | `/api/clients/bulk-upload/` | Bulk import from Excel (`multipart/form-data`) |

### Requirements
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/requirements/` | List requirements |
| `POST` | `/api/requirements/` | Create requirement |
| `GET/PATCH` | `/api/requirements/<id>/` | Get or update requirement |

### Proposals (Client Costing)
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/proposals/` | List or create proposal |
| `POST` | `/api/proposals/<id>/items/` | Add item (catalog or freeform) |
| `PATCH` | `/api/proposal-items/<id>/` | Edit item snapshot |
| `GET` | `/api/proposals/<id>/export/` | Download XLSX |

### Notes & Files
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/notes/` | List or add notes |
| `PATCH` | `/api/notes/<id>/` | Update note text |
| `POST` | `/api/files/` | Upload file to Google Drive |

### Catalog & Audio
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/catalog/items/` | List catalog items |
| `POST` | `/api/audio/transcribe/` | Transcribe audio via Groq |

### CRM
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/crm/projects/` | List or create CRM projects |
| `GET/PATCH` | `/api/crm/projects/<id>/` | Get or update project |
| `GET/POST` | `/api/crm/project-notes/` | Project notes |
| `GET/POST` | `/api/crm/project-files/` | Project file attachments |
| `GET/POST` | `/api/crm/manufacturers/` | Manufacturer master data |
| `GET/POST` | `/api/crm/vendors/` | Vendor master data |
| `GET/POST` | `/api/crm/team-members/` | Internal team members |

---

## Deployment

### Backend → Railway

1. Push the repo to GitHub
2. Go to https://railway.app → **New Project → Deploy from GitHub repo**
3. Select the repo; set **Root Directory** to `backend`
4. Railway auto-detects the `Dockerfile`
5. In the **Variables** tab, paste all values from `backend/.env`
6. Note the public URL (e.g. `https://your-app.up.railway.app`)

### Frontend → Vercel

1. Go to https://vercel.com → **New Project → Import GitHub repo**
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite (auto-detected)
4. **Environment Variables:**
   - `VITE_API_URL` = your Railway URL
   - `VITE_GOOGLE_CLIENT_ID` = your Google OAuth Client ID
5. Deploy and note the Vercel URL
6. In Railway, update `CORS_ALLOWED_ORIGINS` to include the Vercel URL

### Google Cloud — OAuth Setup

1. Go to https://console.cloud.google.com → create a project
2. Enable: **Google Drive API**, **Google Identity Services**
3. **APIs & Services → OAuth consent screen** → configure (app name: Skinovation Sciences)
4. **Credentials → Create OAuth Client ID** (Web application)
   - Authorized JS origins: `http://localhost:5173`, `https://<your-vercel-domain>`
5. Copy Client ID → both `GOOGLE_CLIENT_ID` (backend) and `VITE_GOOGLE_CLIENT_ID` (frontend)
6. Copy Client Secret → `GOOGLE_CLIENT_SECRET` (backend)

### Google Drive — Owner Account Setup

```bash
# In Google Cloud Credentials, add redirect URI: http://localhost:8080/
# Then run:
cd backend
.venv\Scripts\activate
python manage.py connect_drive_owner
# Sign in with the account that will own uploaded files
# Copy the printed GOOGLE_DRIVE_REFRESH_TOKEN= into .env
```

### Handing Over to the Client

Every external service is configured via environment variables. Handover:

1. Client creates accounts in Supabase, Google Cloud, Groq, Railway, Vercel
2. Client generates new credentials
3. Client updates env vars in Railway + Vercel dashboards
4. No code changes required

---

## User Roles

| Role | Access |
|---|---|
| `admin` | Full access: delete notes, manage catalog, manage users, delete anything |
| `poc_sales` | Sales workflows; can create/edit requirements, proposals, CRM projects |
| `poc_formulation` | Formulation/ops workflows; CRM project operations |

---

## Troubleshooting

### `CORS` errors in browser
- Ensure `CORS_ALLOWED_ORIGINS` in `backend/.env` includes your frontend URL exactly (no trailing slash)
- After updating Railway vars, redeploy the backend

### File uploads not working
- Check `GOOGLE_DRIVE_REFRESH_TOKEN` and `GOOGLE_DRIVE_ROOT_FOLDER_ID` are both set
- The Drive folder must be shared with the connected account or service account
- Axios requires `Content-Type: multipart/form-data` to be set explicitly for file POST requests (the axios instance defaults to `application/json`)

### Audio transcription failing
- Ensure `GROQ_API_KEY` is valid at https://console.groq.com/keys
- Audio capture only works in **Chrome** (uses Web Speech API)

### Database migration errors
```bash
cd backend
.venv\Scripts\activate
python manage.py migrate --run-syncdb
```

### Catalog not appearing in proposals
- Ensure `python scripts/seed_catalog.py` was run, or items were added via Admin → Catalog
- Check the catalog items have `body_part` and `category` populated (required for filtering)

### `Pending Migrations` error on Railway
- Railway runs migrations on deploy via the Dockerfile entrypoint. If a migration fails, check Railway build logs.

### Google Drive `insufficientPermissions`
- Service account uploads require a **Google Workspace Shared Drive** — personal Drive quota is not available to service accounts
- Prefer the owner-account refresh token method (`connect_drive_owner`) for personal Drive storage

---

## Feature Status

| Feature | Status |
|---|---|
| Google login + email/password login | ✅ |
| Admin-only user creation | ✅ |
| Client management (search by phone/name) | ✅ |
| 8 client status types | ✅ |
| Excel bulk client import | ✅ |
| Capture requirement (manual + audio) | ✅ |
| Cascading dropdowns (body part → category → sub-category → key benefits) | ✅ |
| Free-text dropdowns (custom values allowed) | ✅ |
| Append-only notes with author + timestamp | ✅ |
| Auto-mirror notes for packaging/color/fragrance | ✅ |
| File upload to Google Drive | ✅ |
| Audio capture → Groq transcription + keyword matching | ✅ |
| Auto-save every 3 seconds | ✅ |
| Local draft recovery on page reload | ✅ |
| Client Costing (proposals): edit / preview / export tabs | ✅ |
| 19-column Excel export with logo, header, client info | ✅ |
| Snapshot pattern (edits never mutate catalog) | ✅ |
| Auto-calculated cost columns + Potential MRP | ✅ |
| Smart cost defaults (mfg/packaging/label/monocarton) | ✅ |
| Admin: manage users | ✅ |
| Admin: manage catalog + import from Excel | ✅ |
| CRM Dashboard (pipeline stats + health table) | ✅ |
| CRM Client list + detail (merged with Requirement Tool data) | ✅ |
| CRM Project list + 16-stage detail tracker | ✅ |
| CRM Milestone table (planned vs actual, RAG status) | ✅ |
| CRM Key Learnings (similarity-matched) | ✅ |
| CRM Master Data (manufacturers, vendors, team members) | ✅ |
| CRM Financials view | ✅ |
| Dark mode throughout | ✅ |
| Accessibility: ARIA labels, focus rings, keyboard nav | ✅ |
| Bulk Excel upload templates for CRM | 🔲 v2 |
