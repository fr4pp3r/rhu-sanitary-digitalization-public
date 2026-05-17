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
const API_BASE = '/api';
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const IMAGE_COMPRESSION_THRESHOLD_BYTES = 400 * 1024;
const IMAGE_MAX_DIMENSION = 1400;
const IMAGE_JPEG_QUALITY = 0.78;

function _loadStore() { return loadLocal(STORE_KEY, []); }
function _saveStore(rows) { saveLocal(STORE_KEY, rows); }

function normalizeApplicationRecord(record) {
  if (!record || typeof record !== 'object') return record;
  const uploaded = Array.isArray(record.uploaded_files)
    ? record.uploaded_files
    : Array.isArray(record.files)
      ? record.files
      : [];
  return {
    ...record,
    uploaded_files: uploaded,
    files: uploaded,
    feedback: Array.isArray(record.feedback) ? record.feedback : [],
  };
}

async function tryApi(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, options);
    if (response.status === 404) return { available: false, data: null, error: null };

    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    const payload = isJson ? await response.json() : {};
    if (!response.ok) {
      return {
        available: true,
        data: null,
        error: payload?.error || { message: `Request failed (${response.status})` },
      };
    }

    return { available: true, data: payload?.data ?? payload, error: null };
  } catch {
    return { available: false, data: null, error: null };
  }
}

function uploadViaSignedUrl(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = event => {
      if (typeof onProgress !== 'function' || !event.lengthComputable) return;
      const pct = Math.round((event.loaded / event.total) * 100);
      onProgress(pct);
    };

    xhr.onerror = () => reject({ message: 'Network error while uploading file.' });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (typeof onProgress === 'function') onProgress(100);
        resolve(true);
        return;
      }
      reject({ message: `Upload failed (${xhr.status}).` });
    };

    xhr.send(file);
  });
}

function compressImageForUpload(file) {
  const isImage = (file?.type || '').startsWith('image/');
  const supported = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!isImage || !supported.includes(file.type) || file.size <= IMAGE_COMPRESSION_THRESHOLD_BYTES) {
    return Promise.resolve(file);
  }

  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const ratio = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * ratio));
      const height = Math.max(1, Math.round(img.height * ratio));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = outputType === 'image/jpeg' ? IMAGE_JPEG_QUALITY : undefined;

      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        if (!blob || blob.size >= file.size * 0.95) {
          resolve(file);
          return;
        }
        resolve(new File([blob], file.name, { type: outputType, lastModified: Date.now() }));
      }, outputType, quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

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
  const apiResult = await tryApi('/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (apiResult.available) {
    return { data: normalizeApplicationRecord(apiResult.data), error: apiResult.error };
  }

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

    return { data: normalizeApplicationRecord(appRow), error: null };
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

  return { data: normalizeApplicationRecord(row), error: null };
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
  const apiResult = await tryApi(`/status?reference=${encodeURIComponent(referenceNumber.trim())}`);
  if (apiResult.available) {
    return { data: normalizeApplicationRecord(apiResult.data), error: apiResult.error };
  }

  const sb = getSupabaseClient();

  if (sb) {
    const { data, error } = await sb
      .from('applications')
      .select('*, application_details(*), uploaded_files(*), feedback(*)')
      .eq('reference_number', referenceNumber.trim().toUpperCase())
      .single();
    return { data: normalizeApplicationRecord(data), error };
  }

  // Demo path
  const rows = _loadStore();
  const row  = rows.find(r => r.reference_number.toUpperCase() === referenceNumber.trim().toUpperCase());
  if (!row) return { data: null, error: { message: 'Application not found.' } };
  return { data: normalizeApplicationRecord(row), error: null };
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
    return { data: normalizeApplicationRecord(data), error };
  }

  // Demo path
  const rows = _loadStore();
  const row  = rows.find(r => r.id === id);
  if (!row) return { data: null, error: { message: 'Not found.' } };
  return { data: normalizeApplicationRecord(row), error: null };
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

function extractStoragePathFromPublicUrl(publicUrl) {
  if (!publicUrl || typeof publicUrl !== 'string') return null;

  const marker = '/storage/v1/object/public/applications/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;

  const encodedPath = publicUrl.slice(idx + marker.length);
  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
}

/**
 * Delete a single uploaded file from an application.
 *
 * @param {string} applicationId
 * @param {{id?:string, file_name?:string, file_url?:string}} fileRecord
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
async function deleteApplicationFile(applicationId, fileRecord) {
  const sb = getSupabaseClient();

  if (sb) {
    const fileUrl = fileRecord?.file_url || null;
    const filePath = extractStoragePathFromPublicUrl(fileUrl);

    if (filePath) {
      const { error: storageErr } = await sb.storage.from('applications').remove([filePath]);
      if (storageErr) {
        console.warn('Storage file remove warning:', storageErr.message);
      }
    }

    if (fileRecord?.id) {
      const { data, error } = await sb
        .from('uploaded_files')
        .delete()
        .eq('id', fileRecord.id)
        .select()
        .single();
      return { data, error };
    }

    const query = sb
      .from('uploaded_files')
      .delete()
      .eq('application_id', applicationId)
      .eq('file_name', fileRecord?.file_name || '');

    if (fileUrl) query.eq('file_url', fileUrl);

    const { data, error } = await query.select();
    const row = Array.isArray(data) ? data[0] || null : data || null;
    return { data: row, error };
  }

  // Demo path
  const rows = _loadStore();
  const app = rows.find(r => r.id === applicationId);
  if (!app) return { data: null, error: { message: 'Application not found.' } };

  app.files = app.files || [];
  const idx = app.files.findIndex(f =>
    (fileRecord?.file_url && f.file_url === fileRecord.file_url) ||
    (fileRecord?.file_name && f.file_name === fileRecord.file_name)
  );

  if (idx === -1) return { data: null, error: { message: 'File not found.' } };

  const [removed] = app.files.splice(idx, 1);
  _saveStore(rows);
  return { data: removed, error: null };
}

/**
 * Delete an entire application and related records.
 *
 * @param {string} applicationId
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
async function deleteApplication(applicationId) {
  const sb = getSupabaseClient();

  if (sb) {
    const { data: fileRows, error: fileFetchErr } = await sb
      .from('uploaded_files')
      .select('id, file_url')
      .eq('application_id', applicationId);

    if (fileFetchErr) return { data: null, error: fileFetchErr };

    const storagePaths = (fileRows || [])
      .map(f => extractStoragePathFromPublicUrl(f.file_url))
      .filter(Boolean);

    if (storagePaths.length > 0) {
      const { error: storageErr } = await sb.storage.from('applications').remove(storagePaths);
      if (storageErr) {
        console.warn('Storage cleanup warning:', storageErr.message);
      }
    }

    const deleteOps = [
      sb.from('uploaded_files').delete().eq('application_id', applicationId),
      sb.from('application_details').delete().eq('application_id', applicationId),
      sb.from('feedback').delete().eq('application_id', applicationId),
      sb.from('applications').delete().eq('id', applicationId).select().single(),
    ];

    const [upFilesRes, detailsRes, feedbackRes, appRes] = await Promise.all(deleteOps);

    const firstErr = upFilesRes.error || detailsRes.error || feedbackRes.error || appRes.error;
    if (firstErr) return { data: null, error: firstErr };

    return { data: appRes.data || { id: applicationId }, error: null };
  }

  // Demo path
  const rows = _loadStore();
  const idx = rows.findIndex(r => r.id === applicationId);
  if (idx === -1) return { data: null, error: { message: 'Application not found.' } };

  const [removed] = rows.splice(idx, 1);
  _saveStore(rows);
  return { data: removed, error: null };
}

// ─── File uploads ─────────────────────────────────────────────────────────────

/**
 * Upload a file for an application to Supabase Storage.
 * Falls back to a data-URL stub in demo mode.
 *
 * @param {string} applicationId
 * @param {File}   file
 * @param {function(number):void} [onProgress]
 * @param {{fieldName?: string}} [options]
 * @returns {Promise<{url: string|null, error: object|null}>}
 */
async function uploadFile(applicationId, file, onProgress, options = {}) {
  const processedFile = await compressImageForUpload(file);
  const fieldTag = options.fieldName ? `${options.fieldName}-` : '';
  const storedFileName = `${fieldTag}${processedFile.name}`;

  if (!ALLOWED_UPLOAD_MIME_TYPES.has(processedFile.type || '')) {
    return { url: null, error: { message: 'Unsupported file type.' } };
  }

  const signResult = await tryApi('/uploads/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      applicationId,
      fileName: storedFileName,
      fileType: processedFile.type,
      fileSize: processedFile.size,
    }),
  });

  if (signResult.available && !signResult.error) {
    try {
      await uploadViaSignedUrl(signResult.data.uploadUrl, processedFile, onProgress);
      const completeResult = await tryApi('/uploads/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          fileName: storedFileName,
          fileType: processedFile.type,
          filePath: signResult.data.path,
          publicUrl: signResult.data.publicUrl,
        }),
      });

      if (completeResult.available && completeResult.error) {
        return { url: null, error: completeResult.error };
      }

      return { url: signResult.data.publicUrl, error: null };
    } catch (err) {
      return { url: null, error: err || { message: 'Upload failed.' } };
    }
  }

  const sb = getSupabaseClient();

  if (sb) {
    const uniquePart = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `${applicationId}/${uniquePart}-${storedFileName}`;
    const { data, error } = await sb.storage
      .from('applications')
      .upload(path, processedFile, { cacheControl: '3600', upsert: false });

    if (error) return { url: null, error };

    const { data: urlData } = sb.storage.from('applications').getPublicUrl(data.path);

    // Record in uploaded_files table
    await sb.from('uploaded_files').insert({
      application_id: applicationId,
      file_name:      storedFileName,
      file_url:       urlData.publicUrl,
      file_type:      processedFile.type,
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
              file_name: storedFileName,
              file_url: reader.result,
              file_type: processedFile.type,
              category: 'receipt',
            });
            _saveStore(rows);
          }
          resolve({ url: reader.result, error: null });
        };
        reader.onerror = () => resolve({ url: null, error: { message: 'FileReader error' } });
        reader.readAsDataURL(processedFile);
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
  deleteApplicationFile,
  deleteApplication,
  uploadFile,
  fetchStats,
};
