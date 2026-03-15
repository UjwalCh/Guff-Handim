const ADMIN_ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  MODERATOR: 'moderator',
  SUPPORT: 'support',
  SECURITY: 'security',
  ADMIN: 'admin', // legacy role kept for backward compatibility
});

const MANAGEABLE_ADMIN_ROLES = Object.freeze([
  ADMIN_ROLES.SUPER_ADMIN,
  ADMIN_ROLES.MODERATOR,
  ADMIN_ROLES.SUPPORT,
  ADMIN_ROLES.SECURITY,
]);

module.exports = {
  ADMIN_ROLES,
  MANAGEABLE_ADMIN_ROLES,
};
