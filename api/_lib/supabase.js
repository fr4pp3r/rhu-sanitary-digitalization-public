const { createClient } = require('@supabase/supabase-js');

let _serverClient = null;

function getEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function getServerClient() {
  if (_serverClient) return _serverClient;

  const supabaseUrl = getEnv('SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  _serverClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return _serverClient;
}

function createReferenceNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SP-${yyyy}${mm}${dd}-${suffix}`;
}

function sanitizeFileName(name) {
  return String(name || 'upload.bin')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 140);
}

module.exports = {
  getServerClient,
  createReferenceNumber,
  sanitizeFileName,
};
