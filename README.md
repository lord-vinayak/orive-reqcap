# Skinovation Sciences — Requirement Capturing Tool

A web app to capture client product requirements and generate Excel proposals.

- **Frontend:** React + Vite + TypeScript + Tailwind (hosted on Vercel)
- **Backend:** Django + DRF, Dockerized (hosted on Railway)
- **Database:** PostgreSQL on Supabase
- **File storage:** Google Drive (single connected owner account, service account fallback)
- **Audio:** Web Speech API (Chrome) → Groq LLM + keyword matching
- **Theme:** white / black / mustard, Aptos font

---

## Project structure

```
requirement-tool/
├── backend/           Django backend (Dockerized for Railway)
│   ├── core/          Settings, URLs, WSGI
│   ├── apps/          users, clients, requirements_app, notes, files, catalog, proposals, audio
│   ├── scripts/       seed_catalog.py for one-time Excel import
│   ├── .env.example   ← copy to .env, fill in keys
│   └── Dockerfile
└── frontend/          React + Vite frontend
    ├── src/
    │   ├── pages/     Login, Home, RequirementForm, Proposal, AdminUsers, AdminCatalog…
    │   ├── components/
    │   ├── services/  API client
    │   └── store/     Zustand auth store
    └── .env.example   ← copy to .env, fill in keys
```

---

## Step-by-step setup

### 1. Create third-party accounts and get credentials

You need:

| Service | What you'll get | Free? |
|---|---|---|
| **Supabase** | Database connection string | Yes, free tier 500 MB |
| **Google Cloud** | OAuth Client ID/Secret + Drive owner refresh token | Yes |
| **Groq** | Free API key for audio transcript extraction | Yes |
| **Railway** | Backend hosting | $5 trial credit |
| **Vercel** | Frontend hosting | Yes, free tier |

#### A. Supabase (database)

1. Go to https://supabase.com → create a new project
2. In **Project Settings → Database → Connection string → URI**, copy the value
3. Paste it into `backend/.env` as `DATABASE_URL`

#### B. Google Cloud — OAuth (Sign in with Google)

1. Go to https://console.cloud.google.com → create a new project
2. Enable: **Google Drive API**, **Google Identity Services**
3. Go to **APIs & Services → OAuth consent screen** → set up (Internal or External, Skinovation Sciences as app name)
4. Go to **Credentials → Create Credentials → OAuth Client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5173`, `https://<your-vercel-domain>`
   - Authorized redirect URIs: not needed for Google Identity Services (token-based)
5. Copy **Client ID** and **Client Secret**
   - Paste `Client ID` into both `backend/.env` (`GOOGLE_CLIENT_ID`) and `frontend/.env` (`VITE_GOOGLE_CLIENT_ID`)
   - Paste `Client Secret` into `backend/.env` (`GOOGLE_CLIENT_SECRET`)

#### C. Google Cloud — Service Account (Drive uploads)

1. In the same Google Cloud project → **IAM & Admin → Service Accounts → Create Service Account**
2. Name it `requirement-tool-drive`, grant no roles
3. After creation, open it → **Keys → Add key → Create new key → JSON** → download the `.json` file
4. In your Google Drive, create a folder named `Skinovation Requirement Tool` (or any name)
5. Right-click the folder → **Share** → paste the service account email (something like `xxx@xxx.iam.gserviceaccount.com`) and give it **Editor** access
6. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/THIS_IS_THE_ID`
7. In `backend/.env`:
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID` = the folder ID
   - `GOOGLE_DRIVE_CREDENTIALS_JSON` = paste the full JSON content as a one-line string, **or** set `GOOGLE_DRIVE_CREDENTIALS_FILE` to the absolute path of the JSON file

#### C2. Google Drive owner account (recommended for uploads)

Use this when all uploaded files should go into one real Google account, such as a client account with Google One storage.

1. In Google Drive, log in as the account that should own uploaded files
2. Create a folder named `Skinovation Requirement Tool` (or any name)
3. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/THIS_IS_THE_ID`
4. In Google Cloud **Credentials -> OAuth Client ID**, add this redirect URI:
   - `http://localhost:8080/`
5. In `backend/.env`, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
6. Run:
   ```bash
   cd backend
   python manage.py connect_drive_owner
   ```
7. Sign in with the Drive owner account and approve access
8. Copy the printed `GOOGLE_DRIVE_REFRESH_TOKEN=...` into `backend/.env`
9. In `backend/.env`, set:
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID` = the folder ID
   - `GOOGLE_DRIVE_REFRESH_TOKEN` = the token printed by the command

Service account upload is still supported as a fallback, but Google requires service accounts to upload into a Google Workspace Shared Drive because service accounts do not have personal Drive storage quota.

#### D. Groq API (audio extraction)

1. Go to https://console.groq.com/keys → sign up (free) → create an API key
2. Paste into `backend/.env` as `GROQ_API_KEY`

---

### 2. Backend — local development

```bash
cd backend

# Create virtual env
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Install deps
pip install -r requirements.txt

# Set up env
cp .env.example .env            # then edit .env with real values

# Migrate database
python manage.py migrate

# Create the first admin user (uses INITIAL_ADMIN_* from .env)
python manage.py bootstrap_admin

# (Optional) Seed the catalog from the supplied Excel file
python scripts/seed_catalog.py "E:/Orive/Content for Website.xlsx"

# Run dev server
python manage.py runserver 0.0.0.0:8000

python manage.py connect_drive_owner
```

Backend will be at http://localhost:8000

---

### 3. Frontend — local development

```bash
cd frontend
npm install
cp .env.example .env            # then edit .env with real values
npm run dev
```

Frontend will be at http://localhost:5173

---

### 4. Deploy backend to Railway

1. Push the repo to GitHub
2. Go to https://railway.app → New Project → **Deploy from GitHub repo**
3. Select the repo. Railway auto-detects the `Dockerfile` in `backend/`
   - In project settings, set **Root Directory** to `backend`
4. In the Railway **Variables** tab, paste every variable from `backend/.env`
5. Railway will build and deploy. Note the public URL (something like `https://your-app.up.railway.app`)

---

### 5. Deploy frontend to Vercel

1. Go to https://vercel.com → New Project → import the GitHub repo
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite (auto-detected)
4. **Environment Variables:**
   - `VITE_API_URL` = `https://your-app.up.railway.app`
   - `VITE_GOOGLE_CLIENT_ID` = (same as backend)
5. Deploy. Vercel will give you a URL like `https://orive-reqcap.vercel.app`
6. **Back in Railway**, update `CORS_ALLOWED_ORIGINS` to include the Vercel URL

---

## Logging in for the first time

After deployment:

1. The backend automatically creates an admin user from `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` in your env vars (Railway's container runs `bootstrap_admin` on boot).
2. Open the Vercel URL → log in with that email + password.
3. Go to **Users** (top-right) → create more users for your team.
4. Go to **Catalog** → click the file picker to import the Excel catalog.

---

## Switching from your account to the client's account

Every external service (Google Cloud, Groq, Supabase, Railway, Vercel) is configured via env variables. Handover means:

1. Client creates their own account in each service
2. They generate new credentials (OAuth keys, Drive owner token, API keys, DB URL)
3. They update env vars in Railway + Vercel dashboards
4. No code changes required

---

## What's built

| Feature | Status |
|---|---|
| Google login + email/password login | ✅ |
| Admin-only user creation | ✅ |
| Client management (search by phone) | ✅ |
| Capture new requirement (manual + audio) | ✅ |
| Cascading dropdowns (body part → category → sub-category → key benefits) | ✅ |
| Append-only notes with author + timestamp | ✅ |
| File upload to Google Drive (`/<client>/<date>/`) | ✅ |
| Audio capture (Chrome) → Groq + keyword matching | ✅ |
| Auto-save every 3 seconds | ✅ |
| Local draft recovery on page reload | ✅ |
| Proposal Edit / Preview / Export tabs | ✅ |
| Excel export with logo, header, client info, table | ✅ |
| Admin: manage users | ✅ |
| Admin: manage catalog + import from Excel | ✅ |
| Track Project (Coming Soon placeholder) | ✅ |
| Strict white / black / mustard / Aptos theme | ✅ |
| Accessibility: ARIA labels, focus rings, keyboard nav | ✅ |
