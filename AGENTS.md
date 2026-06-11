# AGENTS.md

- Run the app with `npx serve .` (ES modules require an HTTP server).
- Load Supabase JS SDK via `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`; otherwise the code falls back to a localStorage demo store (`rhu_applications`).
- Vercel deployment expects env vars `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (see `.env.example`).
- API endpoints: `GET /api/status?reference=...` returns application status; `POST /api/applications` creates a new application; upload flow uses `POST /api/uploads/sign` then `POST /api/uploads/complete`.
- `serve.json` disables clean URLs and trailing slashes – keep defaults when serving locally.
- Offline mode: when Supabase client is unavailable, `js/db.js` uses `localStorage` and generates reference numbers with `generateReferenceNumber()`.
- Core client functions exported from `js/db.js`: `submitApplication`, `fetchApplications`, `fetchByReferenceNumber`, `fetchApplicationById`, `updateApplicationStatus`, `addFeedback`, `deleteApplicationFile`, `deleteApplication`, `uploadFile`, `fetchStats`.
- File upload: allowed MIME types are PDF, JPEG, PNG, WebP, DOC, DOCX; images >400KB are compressed before upload.
- Deleting an application also removes associated storage files via Supabase storage API.
- No build or lint scripts; the repo is pure static HTML/JS.