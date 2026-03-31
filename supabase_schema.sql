-- ============================================================
-- RHU Sanitary Permit System – Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Table: applications ──────────────────────────────────────
create table if not exists public.applications (
  id               uuid         primary key default gen_random_uuid(),
  reference_number text         not null unique,
  applicant_name   text         not null,
  contact_info     text         not null,
  application_type text         not null,
  status           text         not null default 'pending'
                                check (status in ('pending','approved','rejected','needs_revision')),
  created_at       timestamptz  not null default now()
);

-- ── Table: application_details ───────────────────────────────
-- Flexible key-value rows for different application types
create table if not exists public.application_details (
  id             uuid  primary key default gen_random_uuid(),
  application_id uuid  not null references public.applications(id) on delete cascade,
  field_name     text  not null,
  field_value    text  not null default ''
);

create index if not exists idx_app_details_application_id
  on public.application_details (application_id);

-- ── Table: uploaded_files ────────────────────────────────────
create table if not exists public.uploaded_files (
  id             uuid        primary key default gen_random_uuid(),
  application_id uuid        not null references public.applications(id) on delete cascade,
  file_name      text        not null,
  file_url       text        not null,
  file_type      text        not null default '',
  created_at     timestamptz not null default now()
);

create index if not exists idx_uploaded_files_application_id
  on public.uploaded_files (application_id);

-- ── Table: feedback ──────────────────────────────────────────
create table if not exists public.feedback (
  id             uuid        primary key default gen_random_uuid(),
  application_id uuid        not null references public.applications(id) on delete cascade,
  message        text        not null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_feedback_application_id
  on public.feedback (application_id);

-- ── Table: application_types (future use) ────────────────────
create table if not exists public.application_types (
  id          uuid  primary key default gen_random_uuid(),
  name        text  not null,
  description text  not null default ''
);

-- ── Table: requirements (future use) ─────────────────────────
create table if not exists public.requirements (
  id                  uuid    primary key default gen_random_uuid(),
  application_type_id uuid    not null references public.application_types(id) on delete cascade,
  file_label          text    not null,
  required            boolean not null default true
);

-- ============================================================
-- Row-Level Security (RLS)
-- ============================================================

alter table public.applications        enable row level security;
alter table public.application_details enable row level security;
alter table public.uploaded_files      enable row level security;
alter table public.feedback            enable row level security;

-- ── Clients: can INSERT and read their own application by reference number ──

-- Anon / public can insert a new application
create policy "public_insert_applications"
  on public.applications for insert
  with check (true);

-- Anon / public can insert application_details
create policy "public_insert_application_details"
  on public.application_details for insert
  with check (true);

-- Anon / public can insert uploaded_files
create policy "public_insert_uploaded_files"
  on public.uploaded_files for insert
  with check (true);

-- Anon / public can read a single application row (for status tracking)
-- They must supply the reference_number via the query; the policy allows it.
create policy "public_select_own_application"
  on public.applications for select
  using (true);   -- further restricted in the app by the reference_number filter

create policy "public_select_application_details"
  on public.application_details for select
  using (true);

create policy "public_select_feedback"
  on public.feedback for select
  using (true);

-- ── Admins: full access via Supabase Auth (authenticated role) ──

create policy "admin_all_applications"
  on public.applications for all
  to authenticated
  using (true)
  with check (true);

create policy "admin_all_application_details"
  on public.application_details for all
  to authenticated
  using (true)
  with check (true);

create policy "admin_all_uploaded_files"
  on public.uploaded_files for all
  to authenticated
  using (true)
  with check (true);

create policy "admin_all_feedback"
  on public.feedback for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Storage Bucket
-- Run the following SQL in the Supabase SQL Editor to create
-- the storage bucket and its access policies.
-- ============================================================

-- Create the bucket (idempotent)
insert into storage.buckets (id, name, public)
values ('applications', 'applications', true)
on conflict (id) do nothing;

-- Allow public uploads to the applications bucket
create policy "public_upload_applications"
  on storage.objects for insert
  with check (bucket_id = 'applications');

-- Allow public reads (for file previews / download links)
create policy "public_read_applications"
  on storage.objects for select
  using (bucket_id = 'applications');

-- Admins can manage all files
create policy "admin_all_storage"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'applications')
  with check (bucket_id = 'applications');
