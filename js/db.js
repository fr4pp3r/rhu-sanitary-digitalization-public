/**
 * db.js
 * Data-access layer.
 *
 * When Supabase is configured (SUPABASE_URL replaced with real values) every
 * call talks to the real database.  When Supabase is NOT available the module
 * falls back to an in-browser localStorage demo store so the UI is fully
 * functional without a backend during Phase 1 development.
 */

import { getSupabaseClient } from './supabase.js';
import { generateReferenceNumber, saveLocal, loadLocal } from './utils.js';

// ─── Demo / offline store ─────────────────────────────────────────────────────
const STORE_KEY = 'rhu_applications';

function _loadStore() { return loadLocal(STORE_KEY, []); }
function _saveStore(rows) { saveLocal(STORE_KEY, rows); }

// ─── Applications ─────────────────────────────────────────────────────────────

/**
 * Submit a new application.
 *
 * @param {{
 *   applicant_name: string,
 *   contact_info:   string,
 *   application_type: string,
 *   details: Record<string, string>,
 * }} payload
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
async function submitApplication(payload) {
  const sb = getSupabaseClient();

  const reference_number = generateReferenceNumber();

  if (sb) {
    // ── Supabase path ──
    const { data: appRow, error: appErr } = await sb
      .from('applications')
      .insert({
        reference_number,
        applicant_name:   payload.applicant_name,
        contact_info:     payload.contact_info,
        application_type: payload.application_type,
        status:           'pending',
      })
      .select()
      .single();

    if (appErr) return { data: null, error: appErr };

    // Insert detail rows
    const detailRows = Object.entries(payload.details || {}).map(([field_name, field_value]) => ({
      application_id: appRow.id,
      field_name,
      field_value: String(field_value ?? ''),
    }));

    if (detailRows.length > 0) {
      const { error: detErr } = await sb.from('application_details').insert(detailRows);
      if (detErr) console.warn('Could not save application details:', detErr.message);
    }

    return { data: appRow, error: null };
  }

  // ── Demo / offline path ──
  const row = {
    id:               crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    reference_number,
    applicant_name:   payload.applicant_name,
    contact_info:     payload.contact_info,
    application_type: payload.application_type,
    status:           'pending',
    created_at:       new Date().toISOString(),
    details:          payload.details || {},
    files:            [],
    feedback:         [],
  };

  const rows = _loadStore();
  rows.push(row);
  _saveStore(rows);

  return { data: row, error: null };
}

/**
 * Fetch all applications (admin use).
 * @returns {Promise<{data: object[]|null, error: object|null}>}
 */
async function fetchApplications({ status, search, page = 1, perPage = 15 } = {}) {
  const sb = getSupabaseClient();

  if (sb) {
    let query = sb
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (status && status !== 'all') query = query.eq('status', status);
    if (search) query = query.or(
      `applicant_name.ilike.%${search}%,reference_number.ilike.%${search}%,application_type.ilike.%${search}%`
    );

    const { data, error } = await query;
    return { data, error };
  }

  // Demo path
  let rows = _loadStore();
  if (status && status !== 'all') rows = rows.filter(r => r.status === status);
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(r =>
      r.applicant_name.toLowerCase().includes(q) ||
      r.reference_number.toLowerCase().includes(q) ||
      r.application_type.toLowerCase().includes(q)
    );
  }
  rows = [...rows].reverse(); // newest first
  return { data: rows, error: null };
}

/**
 * Get a single application by its reference number (public status tracking).
 * @param {string} referenceNumber
 */
async function fetchByReferenceNumber(referenceNumber) {
  const sb = getSupabaseClient();

  if (sb) {
    const { data, error } = await sb
      .from('applications')
      .select('*, application_details(*), uploaded_files(*), feedback(*)')
      .eq('reference_number', referenceNumber.trim().toUpperCase())
      .single();
    return { data, error };
  }

  // Demo path
  const rows = _loadStore();
  const row  = rows.find(r => r.reference_number.toUpperCase() === referenceNumber.trim().toUpperCase());
  if (!row) return { data: null, error: { message: 'Application not found.' } };
  return { data: row, error: null };
}

/**
 * Get a single application by ID (admin use).
 * @param {string} id
 */
async function fetchApplicationById(id) {
  const sb = getSupabaseClient();

  if (sb) {
    const { data, error } = await sb
      .from('applications')
      .select('*, application_details(*), uploaded_files(*), feedback(*)')
      .eq('id', id)
      .single();
    return { data, error };
  }

  // Demo path
  const rows = _loadStore();
  const row  = rows.find(r => r.id === id);
  if (!row) return { data: null, error: { message: 'Not found.' } };
  return { data: row, error: null };
}

/**
 * Update the status of an application (admin use).
 * @param {string} id
 * @param {'pending'|'for_payment'|'approved'|'rejected'|'needs_revision'} status
 */
async function updateApplicationStatus(id, status) {
  const sb = getSupabaseClient();

  if (sb) {
    const { data, error } = await sb
      .from('applications')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }

  // Demo path
  const rows = _loadStore();
  const idx  = rows.findIndex(r => r.id === id);
  if (idx === -1) return { data: null, error: { message: 'Not found.' } };
  rows[idx].status = status;
  _saveStore(rows);
  return { data: rows[idx], error: null };
}

/**
 * Add feedback to an application (admin use).
 * @param {string} applicationId
 * @param {string} message
 */
async function addFeedback(applicationId, message) {
  const sb = getSupabaseClient();

  if (sb) {
    const { data, error } = await sb
      .from('feedback')
      .insert({ application_id: applicationId, message })
      .select()
      .single();
    return { data, error };
  }

  // Demo path
  const rows   = _loadStore();
  const app    = rows.find(r => r.id === applicationId);
  if (!app) return { data: null, error: { message: 'Not found.' } };
  const fbRow  = { id: String(Date.now()), application_id: applicationId, message, created_at: new Date().toISOString() };
  app.feedback = app.feedback || [];
  app.feedback.push(fbRow);
  _saveStore(rows);
  return { data: fbRow, error: null };
}

// ─── File uploads ─────────────────────────────────────────────────────────────

/**
 * Upload a file for an application to Supabase Storage.
 * Falls back to a data-URL stub in demo mode.
 *
 * @param {string} applicationId
 * @param {File}   file
 * @param {function(number):void} [onProgress]
 * @returns {Promise<{url: string|null, error: object|null}>}
 */
async function uploadFile(applicationId, file, onProgress) {
  const sb = getSupabaseClient();

  if (sb) {
    const path = `${applicationId}/${Date.now()}-${file.name}`;
    const { data, error } = await sb.storage
      .from('applications')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (error) return { url: null, error };

    const { data: urlData } = sb.storage.from('applications').getPublicUrl(data.path);

    // Record in uploaded_files table
    await sb.from('uploaded_files').insert({
      application_id: applicationId,
      file_name:      file.name,
      file_url:       urlData.publicUrl,
      file_type:      file.type,
    });

    return { url: urlData.publicUrl, error: null };
  }

  // Demo: simulate upload with a fake delay and data-URL
  return new Promise(resolve => {
    let progress = 0;
    const interval = setInterval(() => {
      progress = Math.min(progress + 20, 100);
      if (typeof onProgress === 'function') onProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        const reader = new FileReader();
        reader.onload = () => {
          const rows = _loadStore();
          const app = rows.find(r => r.id === applicationId);
          if (app) {
            app.files = app.files || [];
            app.files.push({
              file_name: file.name,
              file_url: reader.result,
              file_type: file.type,
              category: 'receipt',
            });
            _saveStore(rows);
          }
          resolve({ url: reader.result, error: null });
        };
        reader.onerror = () => resolve({ url: null, error: { message: 'FileReader error' } });
        reader.readAsDataURL(file);
      }
    }, 200);
  });
}

/**
 * Get dashboard count statistics (admin).
 * @returns {Promise<{total:number, pending:number, for_payment:number, approved:number, rejected:number, needs_revision:number}>}
 */
async function fetchStats() {
  const sb = getSupabaseClient();

  if (sb) {
    const [total, pending, for_payment, approved, rejected, needs_revision] = await Promise.all([
      sb.from('applications').select('id', { count: 'exact', head: true }),
      sb.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'for_payment'),
      sb.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      sb.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
      sb.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'needs_revision'),
    ]);
    return {
      total:          total.count     || 0,
      pending:        pending.count   || 0,
      for_payment:    for_payment.count || 0,
      approved:       approved.count  || 0,
      rejected:       rejected.count  || 0,
      needs_revision: needs_revision.count || 0,
    };
  }

  // Demo
  const rows = _loadStore();
  const count = s => rows.filter(r => r.status === s).length;
  return {
    total:          rows.length,
    pending:        count('pending'),
      for_payment:    count('for_payment'),
    approved:       count('approved'),
    rejected:       count('rejected'),
    needs_revision: count('needs_revision'),
  };
}

export {
  submitApplication,
  fetchApplications,
  fetchByReferenceNumber,
  fetchApplicationById,
  updateApplicationStatus,
  addFeedback,
  uploadFile,
  fetchStats,
};
