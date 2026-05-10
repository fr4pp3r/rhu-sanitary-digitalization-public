const { getServerClient, createReferenceNumber } = require('./_lib/supabase');
const { sendJson, methodNotAllowed, readString } = require('./_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const applicantName = readString(req.body?.applicant_name);
  const contactInfo = readString(req.body?.contact_info);
  const applicationType = readString(req.body?.application_type);
  const details = req.body?.details && typeof req.body.details === 'object' ? req.body.details : {};

  if (!applicantName || !contactInfo || !applicationType) {
    sendJson(res, 400, { error: { message: 'Missing required application fields.' } });
    return;
  }

  try {
    const sb = getServerClient();

    let appRow = null;
    let insertError = null;

    for (let i = 0; i < 3; i += 1) {
      const referenceNumber = createReferenceNumber();
      const { data, error } = await sb
        .from('applications')
        .insert({
          reference_number: referenceNumber,
          applicant_name: applicantName,
          contact_info: contactInfo,
          application_type: applicationType,
          status: 'pending',
        })
        .select()
        .single();

      if (!error) {
        appRow = data;
        insertError = null;
        break;
      }

      insertError = error;
      if (error.code !== '23505') break;
    }

    if (insertError || !appRow) {
      sendJson(res, 500, { error: { message: insertError?.message || 'Failed to create application.' } });
      return;
    }

    const detailRows = Object.entries(details).map(([fieldName, fieldValue]) => ({
      application_id: appRow.id,
      field_name: String(fieldName || '').slice(0, 120),
      field_value: String(fieldValue ?? '').slice(0, 2000),
    }));

    if (detailRows.length > 0) {
      const { error: detailsError } = await sb.from('application_details').insert(detailRows);
      if (detailsError) {
        sendJson(res, 500, { error: { message: detailsError.message } });
        return;
      }
    }

    sendJson(res, 200, { data: appRow });
  } catch (error) {
    sendJson(res, 500, { error: { message: error.message || 'Internal server error.' } });
  }
};
