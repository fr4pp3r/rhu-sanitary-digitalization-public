// Vercel serverless function for secure public action logging
// This runs only on the server, so we can safely use the Supabase service‑role key.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // privileged key, never exposed to the browser
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, applicantName, referenceNumber, details } = req.body;
  const payload = {
    actor_type: 'applicant',
    actor_identifier: applicantName,
    reference_number: referenceNumber,
    action,
    details,
  };

  const { error } = await supabase.from('logs').insert(payload);
  if (error) {
    console.error('log insert error', error);
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json({ success: true });
}
