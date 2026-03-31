/**
 * supabase.js
 * Supabase client configuration.
 *
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY with the values found in your
 * Supabase project's Settings → API page.
 */

const SUPABASE_URL  = 'https://your-project-ref.supabase.co';
const SUPABASE_ANON = 'your-anon-public-key';

// Lazy-initialised singleton so every module shares the same client.
let _client = null;

function getSupabaseClient() {
  if (_client) return _client;
  if (typeof window.supabase === 'undefined') {
    console.warn('Supabase JS SDK not loaded. Running in demo / offline mode.');
    return null;
  }
  _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  return _client;
}

export { getSupabaseClient, SUPABASE_URL, SUPABASE_ANON };
