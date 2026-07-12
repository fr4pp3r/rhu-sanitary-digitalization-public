const { getServerClient, createReferenceNumber } = require('./_lib/supabase');
const { sendJson, methodNotAllowed, readString } = require('./_lib/http');

const CATEGORY_FEE_SERVICE_IDS = new Set([
  'health_card_non_food_handlers_green',
  'provisional_sanitary_permit_new_business',
  'sanitary_permit_new_renewal',
]);

function toFeeNumber(value) {
  const fee = Number(value);
  return Number.isFinite(fee) && fee >= 0 ? fee : null;
}

function normalizeFeeSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object') return {};
  const normalized = {};
  Object.entries(schedule).forEach(([category, amount]) => {
    const categoryName = String(category || '').trim();
    const fee = toFeeNumber(amount);
    if (!categoryName || fee === null) return;
    normalized[categoryName] = fee;
  });
  return normalized;
}

const FALLBACK_SERVICE_DEFINITIONS = {
  health_card_non_food_handlers_green: {
    fee: 130,
    fee_by_category: {
      Amusement: 130,
      'Tonsorial Beauty': 160,
      Construction: 160,
      'Customer Service': 160,
      Entertainment: 160,
      Finance: 160,
      Industrial: 160,
      Managerial: 160,
      Medical: 180,
      'Office Staff': 160,
      Professional: 160,
      Publishing: 160,
      'Retail / Wholesale': 160,
      'Tourist Oriented': 160,
    },
  },
  provisional_sanitary_permit_new_business: {
    fee: 0,
    fee_by_category: {
      'Airline & Shipping Company': 560,
      'Other Est.': 120,
      'Amusement Place': 340,
      Contractors: 280,
      'Commodities as non-Essential': 280,
      'Financial Institution': 460,
      'Gasoline Station': 450,
      Accommodation: 140,
      'Jeepney / Terminals': 280,
      'Learning Ins.': 280,
      Manufacturing: 400,
      'Manufacturing of Essential Comm.': 450,
      'Medical Facilities': 150,
      'Medical, Dental and Vet. Clinic': 400,
      'Printing & Publication': 230,
      'Private Hospital': 900,
      'Gen. Service': 300,
      'Dealer of Essential Comm.': 350,
      'Theaters, Cinema etc.': 450,
      Telecom: 560,
    },
  },
  sanitary_permit_new_renewal: {
    fee: 0,
    fee_by_category: {
      'Airline & Shipping Company': 560,
      'Other Est.': 120,
      'Amusement Place': 340,
      Contractors: 280,
      'Commodities as non-Essential': 280,
      'Financial Institution': 460,
      'Gasoline Station': 450,
      Accommodation: 140,
      'Jeepney / Terminals': 280,
      'Learning Ins.': 280,
      Manufacturing: 400,
      'Manufacturing of Essential Comm.': 450,
      'Medical Facilities': 150,
      'Medical, Dental and Vet. Clinic': 400,
      'Printing & Publication': 230,
      'Private Hospital': 900,
      'Gen. Service': 300,
      'Dealer of Essential Comm.': 350,
      'Theaters, Cinema etc.': 450,
      Telecom: 560,
    },
  },
};

function computeFeeSnapshot(applicationType, details, definition = null) {
  const source = definition || FALLBACK_SERVICE_DEFINITIONS[applicationType] || {};
  const feeSchedule = normalizeFeeSchedule(source.fee_by_category);
  const selectedCategory = readString(details?.establishment_category);
  const categoryRequired = CATEGORY_FEE_SERVICE_IDS.has(applicationType);

  if (categoryRequired) {
    if (!selectedCategory || !Object.prototype.hasOwnProperty.call(feeSchedule, selectedCategory)) {
      return { error: 'Invalid or missing establishment category for selected service.' };
    }
    return {
      amount: feeSchedule[selectedCategory],
      category: selectedCategory,
    };
  }

  const baseFee = toFeeNumber(source.fee);
  return {
    amount: baseFee ?? 0,
    category: null,
  };
}

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
    const { data: serviceTypeRow } = await sb
      .from('service_types')
      .select('definition')
      .eq('service_id', applicationType)
      .maybeSingle();
    const serviceDefinition = serviceTypeRow?.definition && typeof serviceTypeRow.definition === 'object'
      ? serviceTypeRow.definition
      : FALLBACK_SERVICE_DEFINITIONS[applicationType] || null;
    const feeSnapshot = computeFeeSnapshot(applicationType, details, serviceDefinition);
    if (feeSnapshot.error) {
      sendJson(res, 400, { error: { message: feeSnapshot.error } });
      return;
    }

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
          fee_amount: feeSnapshot.amount,
          fee_category: feeSnapshot.category,
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
