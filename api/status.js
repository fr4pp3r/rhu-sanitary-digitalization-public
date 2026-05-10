const { getServerClient } = require('./_lib/supabase');
const { sendJson, methodNotAllowed, readString } = require('./_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const reference = readString(req.query?.reference).toUpperCase();
  if (!reference) {
    sendJson(res, 400, { error: { message: 'Reference number is required.' } });
    return;
  }

  try {
    const sb = getServerClient();
    const { data, error } = await sb
      .from('applications')
      .select('*, application_details(*), uploaded_files(*), feedback(*)')
      .eq('reference_number', reference)
      .single();

    if (error || !data) {
      sendJson(res, 404, { error: { message: 'Application not found.' } });
      return;
    }

    const normalized = {
      ...data,
      files: Array.isArray(data.uploaded_files) ? data.uploaded_files : [],
      feedback: Array.isArray(data.feedback) ? data.feedback : [],
    };

    sendJson(res, 200, { data: normalized });
  } catch (error) {
    sendJson(res, 500, { error: { message: error.message || 'Internal server error.' } });
  }
};
