const { getServerClient } = require('../_lib/supabase');
const { sendJson, methodNotAllowed, readString } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const applicationId = readString(req.body?.applicationId);
  const fileName = readString(req.body?.fileName);
  const fileType = readString(req.body?.fileType);
  const publicUrl = readString(req.body?.publicUrl);

  if (!applicationId || !fileName || !publicUrl) {
    sendJson(res, 400, { error: { message: 'Missing required file metadata.' } });
    return;
  }

  try {
    const sb = getServerClient();
    const { data, error } = await sb
      .from('uploaded_files')
      .insert({
        application_id: applicationId,
        file_name: fileName,
        file_url: publicUrl,
        file_type: fileType,
      })
      .select()
      .single();

    if (error) {
      sendJson(res, 500, { error: { message: error.message } });
      return;
    }

    sendJson(res, 200, { data });
  } catch (error) {
    sendJson(res, 500, { error: { message: error.message || 'Internal server error.' } });
  }
};
