function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, { error: { message: 'Method not allowed.' } });
}

function readString(input, fallback = '') {
  if (typeof input !== 'string') return fallback;
  return input.trim();
}

module.exports = {
  sendJson,
  methodNotAllowed,
  readString,
};
