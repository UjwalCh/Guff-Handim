const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticateAdmin, requireAdminRoles } = require('../middleware/adminAuth');
const { upload } = require('../middleware/upload');
const { ADMIN_ROLES } = require('../constants/adminRoles');
const admin = require('../controllers/admin.controller');

const router = express.Router();
const ALL_STAFF = [
  ADMIN_ROLES.SUPER_ADMIN,
  ADMIN_ROLES.MODERATOR,
  ADMIN_ROLES.SUPPORT,
  ADMIN_ROLES.SECURITY,
  ADMIN_ROLES.ADMIN,
];
const MODERATION_STAFF = [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.MODERATOR, ADMIN_ROLES.ADMIN];
const SUPPORT_STAFF = [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUPPORT];
const SECURITY_STAFF = [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SECURITY];

router.use(authenticateAdmin);

router.get('/dashboard', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SECURITY]), admin.dashboard);
router.get('/branding', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), admin.getBranding);
router.put('/branding', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), admin.updateBranding);
router.post('/branding/upload', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), upload.single('asset'), admin.uploadBrandingAsset);
router.get('/landing', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), admin.getLanding);
router.put('/landing', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), admin.updateLanding);
router.post('/landing/upload', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), upload.single('asset'), admin.uploadLandingAsset);

router.get('/users', requireAdminRoles(ALL_STAFF), admin.listUsers);
router.get('/users/:id', requireAdminRoles(ALL_STAFF), admin.getUserDetails);
router.patch('/users/:id/suspend', requireAdminRoles(MODERATION_STAFF), [
  body('reason').optional().isString(),
  body('until').optional().isISO8601(),
], validate, admin.suspendUser);
router.patch('/users/:id/restore', requireAdminRoles(MODERATION_STAFF), admin.restoreUser);
router.patch('/users/:id/verify', requireAdminRoles(SUPPORT_STAFF), admin.verifyUser);
router.post('/users/:id/push-reset-password', requireAdminRoles(SUPPORT_STAFF), admin.pushUserPasswordReset);
router.post('/users/:id/force-logout', requireAdminRoles(SUPPORT_STAFF), admin.forceLogoutUser);
router.get('/support-tickets', requireAdminRoles(SUPPORT_STAFF), admin.listSupportTickets);
router.patch('/support-tickets/:id/respond', requireAdminRoles(SUPPORT_STAFF), [
  body('response').isString().isLength({ min: 3, max: 5000 }),
  body('status').optional().isIn(['open', 'in_progress', 'resolved']),
], validate, admin.respondSupportTicket);
router.post('/users/:id/warn', requireAdminRoles(MODERATION_STAFF), [
  body('reason').isString().isLength({ min: 3, max: 300 }),
], validate, admin.warnUser);

router.get('/reports', requireAdminRoles(MODERATION_STAFF), admin.listReports);
router.post('/reports', requireAdminRoles(MODERATION_STAFF), [
  body('targetType').isIn(['user', 'message', 'status', 'file']),
  body('targetId').isString().notEmpty(),
  body('reason').isString().isLength({ min: 3, max: 300 }),
], validate, admin.createReport);
router.patch('/reports/:id/resolve', requireAdminRoles(MODERATION_STAFF), [
  body('status').optional().isIn(['reviewing', 'resolved', 'rejected']),
], validate, admin.resolveReport);

router.post('/chats/:id/lock', requireAdminRoles(MODERATION_STAFF), admin.lockChat);
router.post('/chats/:id/unlock', requireAdminRoles(MODERATION_STAFF), admin.unlockChat);
router.patch('/groups/:chatId/users/:userId/mute', requireAdminRoles(MODERATION_STAFF), [
  body('until').optional().isISO8601(),
  body('reason').optional().isString().isLength({ min: 3, max: 300 }),
], validate, admin.muteUserInGroup);
router.delete('/groups/:chatId/users/:userId', requireAdminRoles(MODERATION_STAFF), admin.removeUserFromGroup);
router.delete('/groups/:chatId', requireAdminRoles(MODERATION_STAFF), admin.deleteGroup);
router.delete('/messages/:id', requireAdminRoles(MODERATION_STAFF), admin.removeMessage);

router.get('/files', requireAdminRoles(MODERATION_STAFF), admin.listFiles);
router.post('/files/:messageId/flag', requireAdminRoles(MODERATION_STAFF), [body('reason').optional().isString()], validate, admin.flagFile);
router.delete('/files/:messageId', requireAdminRoles(MODERATION_STAFF), [body('reason').optional().isString()], validate, admin.removeFile);

router.get('/announcements', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), admin.listAnnouncements);
router.post('/announcements', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), [
  body('title').isString().isLength({ min: 3, max: 120 }),
  body('message').isString().isLength({ min: 3, max: 5000 }),
], validate, admin.broadcast);
router.delete('/announcements/:id', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), admin.deleteAnnouncement);

router.get('/settings', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), admin.getSettings);
router.put('/settings', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), [body('key').isString().notEmpty()], validate, admin.upsertSetting);
router.get('/system-config', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), admin.listSystemConfig);
router.put('/system-config', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), [body('key').isString().notEmpty()], validate, admin.upsertSystemConfig);
router.post('/database/backup', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), admin.backupDatabase);
router.post('/database/restore', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), [body('file').isString().notEmpty()], validate, admin.restoreDatabase);

router.get('/bans', requireAdminRoles(SECURITY_STAFF), admin.listBans);
router.post('/bans', requireAdminRoles(SECURITY_STAFF), [
  body('type').isIn(['phone', 'ip', 'device']),
  body('value').isString().notEmpty(),
  body('reason').isString().isLength({ min: 3, max: 300 }),
], validate, admin.createBan);
router.delete('/bans/:id', requireAdminRoles(SECURITY_STAFF), admin.removeBan);

router.get('/otp-monitor', requireAdminRoles(SECURITY_STAFF), admin.otpMonitoring);
router.get('/audit-logs', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), admin.auditLogs);
router.get('/security/login-ip-logs', requireAdminRoles(SECURITY_STAFF), admin.loginIpLogs);
router.get('/security/overview', requireAdminRoles(SECURITY_STAFF), admin.securityOverview);
router.put('/security/policies', requireAdminRoles(SECURITY_STAFF), [body('key').isString().notEmpty()], validate, admin.upsertSecurityPolicy);

router.get('/privacy/export/:id', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), admin.exportUserData);
router.delete('/privacy/delete/:id', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), admin.deleteUserData);

router.get('/admin-accounts', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), admin.listAdminAccounts);
router.post('/admin-accounts', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), [
  body('username').isString().isLength({ min: 3, max: 80 }),
  body('phone').isString().isLength({ min: 6, max: 20 }),
  body('password').isString().isLength({ min: 8, max: 120 }),
  body('require2FA').optional().isBoolean(),
  body('role').optional().isIn(['super_admin', 'moderator', 'support', 'security']),
], validate, admin.createAdminAccount);

router.patch('/admin-accounts/:id', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), [
  body('username').optional().isString().isLength({ min: 3, max: 80 }),
  body('phone').optional().isString().isLength({ min: 6, max: 20 }),
  body('password').optional().isString().isLength({ min: 8, max: 120 }),
  body('isActive').optional().isBoolean(),
  body('require2FA').optional().isBoolean(),
  body('role').optional().isIn(['super_admin', 'moderator', 'support', 'security']),
], validate, admin.updateAdminAccount);
router.delete('/admin-accounts/:id', requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), admin.deleteAdminAccount);

router.put('/me/credentials', requireAdminRoles(ALL_STAFF), [
  body('currentPassword').isString().isLength({ min: 8, max: 120 }),
  body('username').optional().isString().isLength({ min: 3, max: 80 }),
  body('phone').optional().isString().isLength({ min: 6, max: 20 }),
  body('newPassword').optional().isString().isLength({ min: 8, max: 120 }),
], validate, admin.updateMyCredentials);

module.exports = router;
