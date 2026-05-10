const { getServerClient, sanitizeFileName } = require('../_lib/supabase');
const { sendJson, methodNotAllowed, readString } = require('../_lib/http');

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const applicationId = readString(req.body?.applicationId);
  const fileName = sanitizeFileName(readString(req.body?.fileName));
  const fileType = readString(req.body?.fileType).toLowerCase();
  const fileSize = Number(req.body?.fileSize || 0);

  if (!applicationId || !fileName || !fileType) {
    sendJson(res, 400, { error: { message: 'Missing required upload fields.' } });
    return;
  }

  if (!ALLOWED_MIME_TYPES.has(fileType)) {
    sendJson(res, 400, { error: { message: 'Unsupported file type.' } });
    return;
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_BYTES) {
    sendJson(res, 400, { error: { message: 'File size exceeds the 10 MB limit.' } });
    return;
  }

  try {
    const sb = getServerClient();

    const { data: appRow, error: appError } = await sb
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .single();

    if (appError || !appRow) {
      sendJson(res, 404, { error: { message: 'Application not found.' } });
      return;
    }

    const path = `${applicationId}/${Date.now()}-${fileName}`;
    const { data, error } = await sb.storage.from('applications').createSignedUploadUrl(path);

    if (error || !data) {
      sendJson(res, 500, { error: { message: error?.message || 'Could not create upload URL.' } });
      return;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const uploadUrl = data.signedUrl.startsWith('http')
      ? data.signedUrl
      : `${supabaseUrl}/storage/v1${data.signedUrl}`;
    const { data: publicData } = sb.storage.from('applications').getPublicUrl(path);

    sendJson(res, 200, {
      data: {
        path,
        uploadUrl,
        token: data.token,
        publicUrl: publicData.publicUrl,
      },
    });
  } catch (error) {
    sendJson(res, 500, { error: { message: error.message || 'Internal server error.' } });
  }
};
