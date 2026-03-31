# RHU Sanitary Permit System

A web-based sanitary permit application and management system for the Rural Health Unit (RHU), built with vanilla HTML/CSS/JavaScript and **Supabase** as the backend.

---

## ✨ Features

### Client Side (No login required)
- **Home Page** — 11 selectable sanitary permit / health certificate application types
- **Application Form** — Multi-step dynamic form (Applicant Info → Business Info → File Uploads → Review & Submit)
- **File Uploads** — Drag-and-drop document uploads stored in Supabase Storage
- **Reference Number** — Auto-generated on submission for status tracking
- **Status Tracking** — Enter your reference number to check application progress and read admin feedback

### Admin Side (Supabase Auth)
- **Login** — Email + password via Supabase Authentication
- **Dashboard** — Summary statistics (total, pending, approved, rejected, needs revision) + recent applications
- **Applications Table** — Search, filter by status, and paginate through all submissions
- **Review Page** — Full application detail, uploaded file viewer, status updater, and feedback sender

---

## 🗂️ Project Structure

```
rhu-sanitary-digitalization/
├── index.html              # Home – application type selector
├── application.html        # Multi-step application form
├── status.html             # Application status tracking
├── admin/
│   ├── login.html          # Admin login
│   ├── dashboard.html      # Admin dashboard
│   ├── applications.html   # Applications list with search/filter
│   └── review.html         # Review individual application
├── css/
│   └── styles.css          # Global stylesheet
├── js/
│   ├── supabase.js         # Supabase client configuration
│   ├── data.js             # Application types & field definitions
│   ├── db.js               # Data access layer (Supabase + offline demo)
│   └── utils.js            # Shared utilities
└── supabase_schema.sql     # Database schema & RLS policies
```

---

## 🚀 Getting Started

### Phase 1 — Static Demo (no backend needed)

1. Clone or download this repository.
2. Open `index.html` in any modern browser (or serve with a local HTTP server, e.g. `npx serve .`).
3. All data is saved to **localStorage** — the app is fully functional without a Supabase account.

> **Note:** ES module `import/export` requires a HTTP server. File-based `file://` protocol will not work for JS modules.

### Phase 2 — Connect Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Run `supabase_schema.sql` in the **SQL Editor** of your Supabase project.
3. Go to **Settings → API** and copy your Project URL and `anon` public key.
4. Edit `js/supabase.js` and replace the placeholder values:

```js
const SUPABASE_URL  = 'https://your-project-ref.supabase.co';
const SUPABASE_ANON = 'your-anon-public-key';
```

5. In **Supabase → Authentication → Providers**, ensure Email is enabled.
6. Create your admin user via **Authentication → Users → Invite user**.
7. Add the Supabase JS SDK via CDN before the closing `</body>` tag of each HTML page:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

---

## 🗄️ Database Schema

| Table                  | Purpose                                              |
|------------------------|------------------------------------------------------|
| `applications`         | Core application record (status, reference number)  |
| `application_details`  | Flexible key-value form field storage per application|
| `uploaded_files`       | File metadata + Supabase Storage URLs                |
| `feedback`             | Admin feedback messages per application              |
| `application_types`    | (Future) dynamic application type config             |
| `requirements`         | (Future) per-type required document definitions      |

### Supabase Storage

Bucket: **`applications`**

```
applications/
  {application_id}/
    {timestamp}-file1.pdf
    {timestamp}-file2.jpg
```

---

## 🔐 Security

- **Row-Level Security (RLS)** enabled on all tables.
- Clients can INSERT applications and SELECT by reference number.
- Admins (authenticated role) have full access.
- Storage policies restrict uploads to the `applications` bucket.
- All user-supplied strings are HTML-escaped before being inserted into the DOM.

---

## 📱 Application Types (11)

1. Sanitary Permit – New Business
2. Sanitary Permit – Renewal
3. Transfer of Ownership
4. Change of Business Name
5. Additional / Expanded Activities
6. Temporary Sanitary Permit
7. Sanitary Clearance
8. Health Certificate
9. Food Handler's Permit
10. Water Refilling Station Permit
11. Swimming Pool / Spa Permit

---

## 🚧 Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Done | Static UI, form structure, localStorage demo |
| 2 | 🔲 Ready | Connect Supabase DB + file uploads |
| 3 | 🔲 Ready | Admin Auth + Dashboard + Review system |
| 4 | 🔲 Planned | Dynamic requirements, notifications, analytics |
