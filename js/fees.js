const CATEGORY_FEE_SERVICE_IDS = new Set([
  'health_card_non_food_handlers_green',
  'provisional_sanitary_permit_new_business',
  'sanitary_permit_new_renewal',
]);

function getNumericFee(value) {
  const fee = Number(value);
  return Number.isFinite(fee) && fee >= 0 ? fee : null;
}

function normalizeFeeSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object') return {};
  const normalized = {};
  Object.entries(schedule).forEach(([category, amount]) => {
    const categoryName = String(category || '').trim();
    const fee = getNumericFee(amount);
    if (!categoryName || fee === null) return;
    normalized[categoryName] = fee;
  });
  return normalized;
}

function supportsCategoryFees(serviceType) {
  if (!serviceType?.id || !CATEGORY_FEE_SERVICE_IDS.has(serviceType.id)) return false;
  return Object.keys(normalizeFeeSchedule(serviceType.fee_by_category)).length > 0;
}

function computeFeeSnapshot(serviceType, details = {}) {
  if (!serviceType) return { amount: null, category: null, source: 'unknown' };

  const schedule = normalizeFeeSchedule(serviceType.fee_by_category);
  const category = String(details.establishment_category || '').trim();
  if (supportsCategoryFees(serviceType) && category && Object.prototype.hasOwnProperty.call(schedule, category)) {
    return { amount: schedule[category], category, source: 'category' };
  }

  const baseFee = getNumericFee(serviceType.fee);
  if (baseFee !== null) {
    return { amount: baseFee, category: null, source: 'flat' };
  }

  return { amount: null, category: null, source: 'unknown' };
}

function describeFee(serviceType, details = {}, pesoFormatter = null) {
  const peso = pesoFormatter || new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
  const snapshot = computeFeeSnapshot(serviceType, details);

  if (snapshot.amount !== null) {
    const amountText = peso.format(snapshot.amount);
    if (snapshot.category) return `${amountText} (${snapshot.category})`;
    return amountText;
  }

  const schedule = normalizeFeeSchedule(serviceType?.fee_by_category);
  const entries = Object.entries(schedule);
  if (entries.length > 0) {
    const amounts = entries.map(([, amount]) => amount);
    return `${peso.format(Math.min(...amounts))} - ${peso.format(Math.max(...amounts))}`;
  }

  return '—';
}

export {
  CATEGORY_FEE_SERVICE_IDS,
  normalizeFeeSchedule,
  supportsCategoryFees,
  computeFeeSnapshot,
  describeFee,
};
