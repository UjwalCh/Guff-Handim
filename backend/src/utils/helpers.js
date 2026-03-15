const path = require('path');

/**
 * Normalize phone number to E.164 format (basic validation).
 * Full production validation should use libphonenumber-js.
 */
function normalizePhone(phone) {
  const cleaned = phone.replace(/\s/g, '');
  if (!/^\+[1-9]\d{6,14}$/.test(cleaned)) {
    throw Object.assign(new Error('Invalid phone number. Use E.164 format, e.g. +14155551234'), { status: 400 });
  }
  return cleaned;
}

/**
 * Build a public URL for a locally stored upload.
 */
function fileUrl(req, filePath) {
  const relative = path.relative(path.join(__dirname, '../../uploads'), filePath);
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/uploads/${relative.replace(/\\/g, '/')}`;
}

/**
 * Attach pagination metadata to a response.
 */
function paginate({ page = 1, limit = 30 } = {}) {
  const p = Math.max(parseInt(page) || 1, 1);
  const l = Math.min(parseInt(limit) || 30, 100);
  return { limit: l, offset: (p - 1) * l, page: p };
}

/**
 * Strip sensitive fields from a user object before returning to client.
 */
function sanitizeUser(user) {
  const obj = user.toJSON ? user.toJSON() : { ...user };
  delete obj.isActive;
  delete obj.passwordHash;
  delete obj.suspendedReason;
  delete obj.role;
  return obj;
}

module.exports = { normalizePhone, fileUrl, paginate, sanitizeUser };
