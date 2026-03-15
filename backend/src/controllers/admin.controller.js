const { Op } = require('sequelize');
const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const {
  User,
  RefreshToken,
  Chat,
  ChatMember,
  Message,
  OTP,
  Report,
  FileModeration,
  AdminAuditLog,
  Announcement,
  SystemSetting,
  BanList,
  AdminAccount,
  AdminSession,
} = require('../models');
const { sequelize } = require('../config/database');
const { sendOTP } = require('../utils/otp');
const { ADMIN_ROLES, MANAGEABLE_ADMIN_ROLES } = require('../constants/adminRoles');

const DEFAULT_BRANDING = {
  appName: 'Guff Handim',
  tagline: 'Private conversations, modern collaboration.',
  logoUrl: '/icon.svg',
  wordmarkUrl: null,
  faviconUrl: '/icon.svg',
  primaryColor: '#059669',
  accentColor: '#0f172a',
};

const DEFAULT_LANDING = {
  heroTitle: 'Talk securely. Share instantly. Stay in control.',
  heroSubtitle: 'Guff Handim brings encrypted messaging, calls, files, statuses, and admin-grade controls into one polished experience.',
  primaryCtaLabel: 'Login',
  primaryCtaHref: '/login',
  secondaryCtaLabel: 'Sign Up',
  secondaryCtaHref: '/signup',
  tertiaryCtaLabel: 'Forgot Password',
  tertiaryCtaHref: '/forgot-password',
  featureCards: [
    { title: 'Encrypted Messaging', description: 'End-to-end protected chats for direct and group conversations.' },
    { title: 'Media & Files', description: 'Share photos, videos, audio, and documents with moderation support.' },
    { title: 'Calls & Presence', description: 'Voice, video, typing indicators, read receipts, and live presence.' },
  ],
  statCards: [
    { label: 'Realtime', value: '24/7' },
    { label: 'Privacy', value: 'E2EE' },
    { label: 'Admin Control', value: 'Full' },
  ],
  heroImageUrl: '/guff-handim-logo.svg',
  footerText: 'Built for secure communities and modern teams.',
};

async function readSetting(key, defaultValue) {
  const setting = await SystemSetting.findByPk(key);
  return setting?.value || defaultValue;
}

async function log(req, action, resourceType, resourceId, metadata) {
  await AdminAuditLog.create({
    adminId: req.admin.id,
    action,
    resourceType,
    resourceId: resourceId || null,
    metadata: metadata || null,
    ipAddress: req.ip,
  });
}

async function dashboard(req, res, next) {
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalChats,
      groupChats,
      totalMessages,
      messagesLast24h,
      openReports,
      flaggedFiles,
      activeBans,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { isOnline: true } }),
      User.count({ where: { isSuspended: true } }),
      Chat.count(),
      Chat.count({ where: { isGroup: true } }),
      Message.count(),
      Message.count({ where: { createdAt: { [Op.gte]: dayAgo } } }),
      Report.count({ where: { status: 'open' } }),
      FileModeration.count({ where: { status: 'flagged' } }),
      BanList.count({ where: { [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: now } }] } }),
    ]);

    const otpStats = {
      issuedLast24h: await OTP.count({ where: { createdAt: { [Op.gte]: dayAgo } } }),
      failedAttemptsLast24h: await OTP.sum('attempts', { where: { createdAt: { [Op.gte]: dayAgo } } }) || 0,
    };

    res.json({
      metrics: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalChats,
        groupChats,
        totalMessages,
        messagesLast24h,
        openReports,
        flaggedFiles,
        activeBans,
      },
      otpStats,
    });
  } catch (err) {
    next(err);
  }
}

async function getBranding(req, res, next) {
  try {
    const branding = await readSetting('site_branding', DEFAULT_BRANDING);
    res.json({ branding: { ...DEFAULT_BRANDING, ...branding } });
  } catch (err) { next(err); }
}

async function updateBranding(req, res, next) {
  try {
    const current = await readSetting('site_branding', DEFAULT_BRANDING);
    const branding = { ...DEFAULT_BRANDING, ...current, ...req.body };
    await SystemSetting.upsert({ key: 'site_branding', value: branding, updatedBy: req.admin.id });
    await log(req, 'branding.update', 'setting', 'site_branding');
    res.json({ branding });
  } catch (err) { next(err); }
}

async function uploadBrandingAsset(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const target = req.body.target || 'logoUrl';
    const current = await readSetting('site_branding', DEFAULT_BRANDING);
    const relativePath = `/${req.file.path.split(/uploads[\\/]/)[1] ? `uploads/${req.file.path.split(/uploads[\\/]/)[1].replace(/\\/g, '/')}` : ''}`;
    const branding = { ...DEFAULT_BRANDING, ...current, [target]: relativePath };
    await SystemSetting.upsert({ key: 'site_branding', value: branding, updatedBy: req.admin.id });
    await log(req, 'branding.asset.upload', 'setting', target, { path: relativePath });
    res.json({ branding, uploaded: { target, url: relativePath } });
  } catch (err) { next(err); }
}

async function getLanding(req, res, next) {
  try {
    const landing = await readSetting('site_landing', DEFAULT_LANDING);
    res.json({ landing: { ...DEFAULT_LANDING, ...landing } });
  } catch (err) { next(err); }
}

async function updateLanding(req, res, next) {
  try {
    const current = await readSetting('site_landing', DEFAULT_LANDING);
    const landing = { ...DEFAULT_LANDING, ...current, ...req.body };
    await SystemSetting.upsert({ key: 'site_landing', value: landing, updatedBy: req.admin.id });
    await log(req, 'landing.update', 'setting', 'site_landing');
    res.json({ landing });
  } catch (err) { next(err); }
}

async function uploadLandingAsset(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const target = req.body.target || 'heroImageUrl';
    const current = await readSetting('site_landing', DEFAULT_LANDING);
    const relativePath = `/${req.file.path.split(/uploads[\\/]/)[1] ? `uploads/${req.file.path.split(/uploads[\\/]/)[1].replace(/\\/g, '/')}` : ''}`;
    const landing = { ...DEFAULT_LANDING, ...current, [target]: relativePath };
    await SystemSetting.upsert({ key: 'site_landing', value: landing, updatedBy: req.admin.id });
    await log(req, 'landing.asset.upload', 'setting', target, { path: relativePath });
    res.json({ landing, uploaded: { target, url: relativePath } });
  } catch (err) { next(err); }
}

async function listUsers(req, res, next) {
  try {
    const q = req.query.query?.trim();
    const where = q
      ? {
          [Op.or]: [
            { name: { [Op.like]: `%${q}%` } },
            { phone: { [Op.like]: `%${q}%` } },
            { email: { [Op.like]: `%${q}%` } },
          ],
        }
      : {};

    const users = await User.findAll({
      where,
      attributes: [
        'id', 'phone', 'email', 'name', 'avatar', 'isVerified', 'isOnline', 'lastSeen',
        'isActive', 'isSuspended', 'suspendedReason', 'suspendedUntil', 'createdAt',
      ],
      order: [['createdAt', 'DESC']],
      limit: 200,
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function suspendUser(req, res, next) {
  try {
    const { reason, until } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({
      isSuspended: true,
      suspendedReason: reason || 'Policy violation',
      suspendedUntil: until || null,
      isOnline: false,
    });

    await log(req, 'user.suspend', 'user', user.id, { reason, until });
    res.json({ message: 'User suspended' });
  } catch (err) {
    next(err);
  }
}

async function restoreUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({ isSuspended: false, suspendedReason: null, suspendedUntil: null });
    await log(req, 'user.restore', 'user', user.id);
    res.json({ message: 'User restored' });
  } catch (err) {
    next(err);
  }
}

async function verifyUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({ isVerified: true });
    await log(req, 'user.verify', 'user', user.id);
    res.json({ message: 'User verified' });
  } catch (err) {
    next(err);
  }
}

async function pushUserPasswordReset(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.phone) return res.status(400).json({ error: 'User phone is missing' });

    await sendOTP(user.phone);
    const [revokedSessions] = await RefreshToken.update({ isRevoked: true }, { where: { userId: user.id } });

    await log(req, 'user.password_reset.push', 'user', user.id, { phone: user.phone, revokedSessions });
    res.json({ message: 'Reset OTP pushed to user phone and active sessions revoked', revokedSessions });
  } catch (err) {
    next(err);
  }
}

async function forceLogoutUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [revokedSessions] = await RefreshToken.update({ isRevoked: true }, { where: { userId: user.id, isRevoked: false } });
    await log(req, 'user.force_logout', 'user', user.id, { revokedSessions });

    res.json({ message: 'User sessions revoked', revokedSessions });
  } catch (err) {
    next(err);
  }
}

async function listSupportTickets(req, res, next) {
  try {
    const status = req.query.status?.trim();
    const key = 'support_tickets';
    const payload = await readSetting(key, { tickets: [] });
    const tickets = Array.isArray(payload?.tickets) ? payload.tickets : [];

    const filtered = status
      ? tickets.filter((ticket) => ticket.status === status)
      : tickets;

    res.json({ tickets: filtered.slice(-500).reverse() });
  } catch (err) {
    next(err);
  }
}

async function respondSupportTicket(req, res, next) {
  try {
    const key = 'support_tickets';
    const payload = await readSetting(key, { tickets: [] });
    const tickets = Array.isArray(payload?.tickets) ? payload.tickets : [];
    const index = tickets.findIndex((ticket) => String(ticket.id) === String(req.params.id));

    if (index === -1) return res.status(404).json({ error: 'Support ticket not found' });

    const ticket = tickets[index];
    const responseEntry = {
      by: req.admin.id,
      role: req.admin.role,
      response: req.body.response,
      at: new Date().toISOString(),
    };

    const responses = Array.isArray(ticket.responses) ? ticket.responses.slice(-49) : [];
    responses.push(responseEntry);

    tickets[index] = {
      ...ticket,
      status: req.body.status || 'resolved',
      responses,
      updatedAt: new Date().toISOString(),
      updatedBy: req.admin.id,
    };

    await SystemSetting.upsert({ key, value: { tickets }, updatedBy: req.admin.id });
    await log(req, 'support.ticket.respond', 'support_ticket', ticket.id, {
      status: tickets[index].status,
    });

    res.json({ ticket: tickets[index], message: 'Support ticket response saved' });
  } catch (err) {
    next(err);
  }
}

async function listReports(req, res, next) {
  try {
    const where = req.query.status ? { status: req.query.status } : {};
    const reports = await Report.findAll({
      where,
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'phone'] },
        { model: AdminAccount, as: 'reviewer', attributes: ['id', 'username'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 500,
    });
    res.json({ reports });
  } catch (err) {
    next(err);
  }
}

async function createReport(req, res, next) {
  try {
    const { targetType, targetId, reason, details, reporterId } = req.body;
    const report = await Report.create({
      targetType,
      targetId,
      reason,
      details,
      reporterId: reporterId || null,
    });
    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
}

async function resolveReport(req, res, next) {
  try {
    const { status, reviewNotes } = req.body;
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    await report.update({
      status: status || 'resolved',
      reviewNotes: reviewNotes || null,
      reviewedBy: req.admin.id,
    });

    await log(req, 'report.resolve', 'report', report.id, { status, reviewNotes });
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

async function lockChat(req, res, next) {
  try {
    const chat = await Chat.findByPk(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    await chat.update({ disappearingTimer: 0 });
    await SystemSetting.upsert({
      key: `chat_locked:${chat.id}`,
      value: { locked: true, by: req.admin.id, at: new Date().toISOString() },
      updatedBy: req.admin.id,
    });

    await log(req, 'chat.lock', 'chat', chat.id);
    res.json({ message: 'Chat locked' });
  } catch (err) {
    next(err);
  }
}

async function unlockChat(req, res, next) {
  try {
    await SystemSetting.destroy({ where: { key: `chat_locked:${req.params.id}` } });
    await log(req, 'chat.unlock', 'chat', req.params.id);
    res.json({ message: 'Chat unlocked' });
  } catch (err) {
    next(err);
  }
}

async function muteUserInGroup(req, res, next) {
  try {
    const { chatId, userId } = req.params;
    const membership = await ChatMember.findOne({ where: { chatId, userId } });
    if (!membership) return res.status(404).json({ error: 'User is not a member of this group' });

    const until = req.body.until ? new Date(req.body.until) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (Number.isNaN(until.getTime())) {
      return res.status(400).json({ error: 'Invalid mute expiry date' });
    }

    await membership.update({ mutedUntil: until });
    await log(req, 'group.member.mute', 'chat', chatId, {
      userId,
      until: until.toISOString(),
      reason: req.body.reason || null,
    });

    res.json({ message: 'User muted in group', mutedUntil: until.toISOString() });
  } catch (err) {
    next(err);
  }
}

async function removeUserFromGroup(req, res, next) {
  try {
    const { chatId, userId } = req.params;
    const membership = await ChatMember.findOne({ where: { chatId, userId } });
    if (!membership) return res.status(404).json({ error: 'User is not a member of this group' });

    await membership.destroy();
    await log(req, 'group.member.remove', 'chat', chatId, { userId });
    res.json({ message: 'User removed from group' });
  } catch (err) {
    next(err);
  }
}

async function deleteGroup(req, res, next) {
  try {
    const chat = await Chat.findByPk(req.params.chatId);
    if (!chat || !chat.isGroup) return res.status(404).json({ error: 'Group not found' });

    await Message.destroy({ where: { chatId: chat.id } });
    await ChatMember.destroy({ where: { chatId: chat.id } });
    await chat.destroy();

    await log(req, 'group.delete', 'chat', chat.id);
    res.json({ message: 'Group deleted' });
  } catch (err) {
    next(err);
  }
}

async function warnUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const reason = (req.body.reason || 'Community guideline warning').trim();
    const key = `user_warning:${user.id}`;
    const current = await readSetting(key, { warnings: [] });
    const warning = {
      by: req.admin.id,
      reason,
      at: new Date().toISOString(),
    };

    const warnings = Array.isArray(current.warnings) ? current.warnings.slice(-49) : [];
    warnings.push(warning);

    await SystemSetting.upsert({ key, value: { warnings }, updatedBy: req.admin.id });
    await log(req, 'user.warn', 'user', user.id, { reason });

    res.json({ message: 'User warning recorded', warning });
  } catch (err) {
    next(err);
  }
}

async function removeMessage(req, res, next) {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    await message.update({ isDeleted: true, encryptedContent: null, type: 'deleted', fileUrl: null });
    await log(req, 'message.remove', 'message', message.id, { chatId: message.chatId });
    res.json({ message: 'Message removed by admin' });
  } catch (err) {
    next(err);
  }
}

async function listFiles(req, res, next) {
  try {
    const files = await Message.findAll({
      where: { type: ['image', 'video', 'audio', 'file'], fileUrl: { [Op.not]: null } },
      attributes: ['id', 'chatId', 'senderId', 'type', 'fileUrl', 'fileName', 'fileSize', 'mimeType', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 500,
    });
    res.json({ files });
  } catch (err) {
    next(err);
  }
}

async function flagFile(req, res, next) {
  try {
    const message = await Message.findByPk(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'File message not found' });

    const { reason } = req.body;
    await FileModeration.upsert({
      messageId: message.id,
      status: 'flagged',
      reason: reason || 'Flagged by admin',
      reviewedBy: req.admin.id,
    });

    await log(req, 'file.flag', 'message', message.id, { reason });
    res.json({ message: 'File flagged' });
  } catch (err) {
    next(err);
  }
}

async function removeFile(req, res, next) {
  try {
    const message = await Message.findByPk(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'File message not found' });

    await message.update({ fileUrl: null, thumbnailUrl: null, isDeleted: true, type: 'deleted' });
    await FileModeration.upsert({
      messageId: message.id,
      status: 'removed',
      reason: req.body.reason || 'Removed by admin',
      reviewedBy: req.admin.id,
    });

    await log(req, 'file.remove', 'message', message.id, { reason: req.body.reason || null });
    res.json({ message: 'File removed' });
  } catch (err) {
    next(err);
  }
}

async function broadcast(req, res, next) {
  try {
    const { title, message, activeTo } = req.body;
    const announcement = await Announcement.create({
      title,
      message,
      activeTo: activeTo || null,
      createdBy: req.admin.id,
    });

    await log(req, 'broadcast.create', 'announcement', announcement.id, { title });
    res.status(201).json({ announcement });
  } catch (err) {
    next(err);
  }
}

async function listAnnouncements(req, res, next) {
  try {
    const announcements = await Announcement.findAll({
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    res.json({ announcements });
  } catch (err) {
    next(err);
  }
}

async function deleteAnnouncement(req, res, next) {
  try {
    await Announcement.destroy({ where: { id: req.params.id } });
    await log(req, 'broadcast.delete', 'announcement', req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
}

async function getSettings(req, res, next) {
  try {
    const settings = await SystemSetting.findAll({ order: [['key', 'ASC']] });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

async function upsertSetting(req, res, next) {
  try {
    const { key, value } = req.body;
    await SystemSetting.upsert({ key, value, updatedBy: req.admin.id });
    await log(req, 'setting.upsert', 'setting', key, { value });
    res.json({ message: 'Setting updated' });
  } catch (err) {
    next(err);
  }
}

async function listSystemConfig(req, res, next) {
  try {
    const settings = await SystemSetting.findAll({
      where: {
        [Op.or]: [
          { key: { [Op.like]: 'api_%' } },
          { key: { [Op.like]: 'server_%' } },
        ],
      },
      order: [['key', 'ASC']],
    });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

async function upsertSystemConfig(req, res, next) {
  try {
    const { key, value } = req.body;
    if (!/^api_|^server_/.test(key || '')) {
      return res.status(400).json({ error: 'System config keys must start with api_ or server_' });
    }

    await SystemSetting.upsert({ key, value, updatedBy: req.admin.id });
    await log(req, 'system.config.upsert', 'setting', key, { value });
    res.json({ message: 'System configuration updated' });
  } catch (err) {
    next(err);
  }
}

async function listBans(req, res, next) {
  try {
    const bans = await BanList.findAll({ order: [['createdAt', 'DESC']], limit: 300 });
    res.json({ bans });
  } catch (err) {
    next(err);
  }
}

async function createBan(req, res, next) {
  try {
    const { type, value, reason, expiresAt } = req.body;
    const ban = await BanList.create({
      type,
      value,
      reason,
      expiresAt: expiresAt || null,
      createdBy: req.admin.id,
    });
    await log(req, 'ban.create', 'ban', ban.id, { type, value, reason, expiresAt });
    res.status(201).json({ ban });
  } catch (err) {
    next(err);
  }
}

async function removeBan(req, res, next) {
  try {
    await BanList.destroy({ where: { id: req.params.id } });
    await log(req, 'ban.remove', 'ban', req.params.id);
    res.json({ message: 'Ban removed' });
  } catch (err) {
    next(err);
  }
}

async function otpMonitoring(req, res, next) {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOtps = await OTP.findAll({
      where: { createdAt: { [Op.gte]: since } },
      order: [['createdAt', 'DESC']],
      limit: 1000,
      attributes: ['phone', 'attempts', 'isUsed', 'createdAt', 'expiresAt'],
    });

    const summary = {
      totalIssued: recentOtps.length,
      averageAttempts: recentOtps.length
        ? Number((recentOtps.reduce((a, b) => a + (b.attempts || 0), 0) / recentOtps.length).toFixed(2))
        : 0,
      unusedCount: recentOtps.filter(o => !o.isUsed).length,
      highRiskPhones: [...new Set(recentOtps.filter(o => (o.attempts || 0) >= 3).map(o => o.phone))],
    };

    res.json({ summary, records: recentOtps });
  } catch (err) {
    next(err);
  }
}

async function auditLogs(req, res, next) {
  try {
    const logs = await AdminAuditLog.findAll({
      include: [{ model: AdminAccount, as: 'admin', attributes: ['id', 'username', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: 1000,
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}

async function loginIpLogs(req, res, next) {
  try {
    const sessions = await AdminSession.findAll({
      include: [{ model: AdminAccount, as: 'admin', attributes: ['id', 'username', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: 500,
      attributes: ['id', 'adminId', 'ipAddress', 'userAgent', 'createdAt', 'expiresAt', 'isRevoked'],
    });

    res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

async function securityOverview(req, res, next) {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      suspiciousOtpCount,
      lockedAdminCount,
      recentIpBans,
      reportsNeedingReview,
      recentlyCreatedUsers,
    ] = await Promise.all([
      OTP.count({ where: { createdAt: { [Op.gte]: since24h }, attempts: { [Op.gte]: 3 } } }),
      AdminAccount.count({ where: { lockedUntil: { [Op.gt]: new Date() } } }),
      BanList.count({ where: { type: 'ip', createdAt: { [Op.gte]: since24h } } }),
      Report.count({ where: { status: { [Op.in]: ['open', 'reviewing'] }, createdAt: { [Op.gte]: since24h } } }),
      User.count({ where: { createdAt: { [Op.gte]: since24h } } }),
    ]);

    const spamCandidateUsers = await User.findAll({
      where: { createdAt: { [Op.gte]: since24h } },
      attributes: ['id', 'phone', 'name', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 150,
    });

    const ids = spamCandidateUsers.map((u) => u.id);
    const messageCounts = ids.length
      ? await Message.findAll({
          where: { senderId: { [Op.in]: ids }, createdAt: { [Op.gte]: since24h } },
          attributes: ['senderId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['senderId'],
          raw: true,
        })
      : [];

    const messageCountMap = new Map(messageCounts.map((row) => [row.senderId, Number(row.count || 0)]));
    const botCandidates = spamCandidateUsers
      .map((user) => ({ ...user.toJSON(), recentMessageCount: messageCountMap.get(user.id) || 0 }))
      .filter((user) => user.recentMessageCount >= 40)
      .slice(0, 20);

    res.json({
      summary: {
        suspiciousOtpCount,
        lockedAdminCount,
        recentIpBans,
        reportsNeedingReview,
        recentlyCreatedUsers,
      },
      botCandidates,
    });
  } catch (err) {
    next(err);
  }
}

async function upsertSecurityPolicy(req, res, next) {
  try {
    const { key, value } = req.body;
    const allowedKeys = ['security_2fa_policy', 'security_rate_limits', 'security_bruteforce_threshold'];
    if (!allowedKeys.includes(key)) {
      return res.status(400).json({ error: 'Unsupported security policy key' });
    }

    await SystemSetting.upsert({ key, value, updatedBy: req.admin.id });
    await log(req, 'security.policy.upsert', 'setting', key, { value });
    res.json({ message: 'Security policy updated' });
  } catch (err) {
    next(err);
  }
}

async function backupDatabase(req, res, next) {
  try {
    if (sequelize.getDialect() !== 'sqlite') {
      return res.status(400).json({ error: 'Backup endpoint is only available for sqlite deployments' });
    }

    const source = path.resolve(process.cwd(), process.env.SQLITE_STORAGE || './dev.sqlite');
    const backupDir = path.resolve(process.cwd(), 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `chatapp-backup-${stamp}.sqlite`;
    const destination = path.join(backupDir, filename);

    await fs.copyFile(source, destination);
    await log(req, 'system.backup.create', 'database', filename);

    res.json({
      message: 'Database backup created',
      backup: {
        file: `backups/${filename}`,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function restoreDatabase(req, res, next) {
  try {
    if (sequelize.getDialect() !== 'sqlite') {
      return res.status(400).json({ error: 'Restore endpoint is only available for sqlite deployments' });
    }

    const requestedFile = req.body.file?.trim();
    if (!requestedFile) return res.status(400).json({ error: 'Backup file is required' });

    const backupPath = path.resolve(process.cwd(), requestedFile);
    const source = path.resolve(process.cwd(), process.env.SQLITE_STORAGE || './dev.sqlite');
    await fs.access(backupPath);

    await fs.copyFile(backupPath, source);
    await log(req, 'system.backup.restore', 'database', requestedFile);

    res.json({ message: 'Database restored from backup. Restart server to fully refresh active DB connections.' });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    next(err);
  }
}

async function exportUserData(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const chats = await ChatMember.findAll({ where: { userId: user.id }, attributes: ['chatId', 'role', 'joinedAt'] });
    const messages = await Message.findAll({
      where: { senderId: user.id },
      attributes: ['id', 'chatId', 'type', 'fileName', 'fileSize', 'mimeType', 'createdAt', 'isDeleted'],
      limit: 5000,
    });

    await log(req, 'privacy.export', 'user', user.id);
    res.json({ export: { user, chats, messages } });
  } catch (err) {
    next(err);
  }
}

async function deleteUserData(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await Message.destroy({ where: { senderId: user.id } });
    await ChatMember.destroy({ where: { userId: user.id } });
    await user.destroy();

    await log(req, 'privacy.delete', 'user', req.params.id);
    res.json({ message: 'User data deleted' });
  } catch (err) {
    next(err);
  }
}

function adminPublic(admin) {
  return {
    id: admin.id,
    username: admin.username,
    phone: admin.phone,
    role: admin.role,
    isActive: admin.isActive,
    require2FA: admin.require2FA,
    lastLoginAt: admin.lastLoginAt,
    lastLoginIp: admin.lastLoginIp,
    createdAt: admin.createdAt,
  };
}

async function countOtherActiveSuperAdmins(excludeAdminId) {
  return AdminAccount.count({
    where: {
      id: { [Op.ne]: excludeAdminId },
      role: ADMIN_ROLES.SUPER_ADMIN,
      isActive: true,
    },
  });
}

async function listAdminAccounts(req, res, next) {
  try {
    const admins = await AdminAccount.findAll({
      attributes: [
        'id', 'username', 'phone', 'role', 'isActive', 'require2FA',
        'lastLoginAt', 'lastLoginIp', 'createdAt',
      ],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    res.json({ admins });
  } catch (err) {
    next(err);
  }
}

async function createAdminAccount(req, res, next) {
  try {
    const username = req.body.username?.trim();
    const phone = req.body.phone?.trim();
    const password = req.body.password;
    const require2FA = req.body.require2FA !== false;
    const requestedRole = (req.body.role || '').trim();
    const role = MANAGEABLE_ADMIN_ROLES.includes(requestedRole)
      ? requestedRole
      : ADMIN_ROLES.MODERATOR;

    if (role === ADMIN_ROLES.SUPER_ADMIN) {
      const activeSuperAdmins = await AdminAccount.count({
        where: { role: ADMIN_ROLES.SUPER_ADMIN, isActive: true },
      });
      if (activeSuperAdmins >= 2) {
        return res.status(400).json({ error: 'Maximum of 2 active super admins is allowed' });
      }
    }

    const existing = await AdminAccount.findOne({
      where: {
        [Op.or]: [{ username }, { phone }],
      },
    });
    if (existing) return res.status(409).json({ error: 'Admin username or phone already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await AdminAccount.create({
      username,
      phone,
      passwordHash,
      role,
      require2FA,
      isActive: true,
    });

    await log(req, 'admin.create', 'admin_account', admin.id, { username, phone, require2FA, role });
    res.status(201).json({ admin: adminPublic(admin) });
  } catch (err) {
    next(err);
  }
}

async function updateAdminAccount(req, res, next) {
  try {
    const account = await AdminAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ error: 'Admin account not found' });

    const updates = {};
    if (req.body.username !== undefined) updates.username = req.body.username.trim();
    if (req.body.phone !== undefined) updates.phone = req.body.phone.trim();
    if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
    if (req.body.require2FA !== undefined) updates.require2FA = Boolean(req.body.require2FA);
    if (req.body.role !== undefined) {
      const requestedRole = String(req.body.role).trim();
      if (!MANAGEABLE_ADMIN_ROLES.includes(requestedRole)) {
        return res.status(400).json({ error: 'Invalid admin role' });
      }
      updates.role = requestedRole;
    }

    if (req.body.password) {
      updates.passwordHash = await bcrypt.hash(req.body.password, 12);
    }

    if (updates.username || updates.phone) {
      const duplicate = await AdminAccount.findOne({
        where: {
          id: { [Op.ne]: account.id },
          [Op.or]: [
            ...(updates.username ? [{ username: updates.username }] : []),
            ...(updates.phone ? [{ phone: updates.phone }] : []),
          ],
        },
      });
      if (duplicate) return res.status(409).json({ error: 'Admin username or phone already exists' });
    }

    const targetRole = updates.role || account.role;
    const targetActive = updates.isActive !== undefined ? updates.isActive : account.isActive;

    if (targetRole === ADMIN_ROLES.SUPER_ADMIN && targetActive) {
      const activeSuperAdmins = await AdminAccount.count({
        where: {
          id: { [Op.ne]: account.id },
          role: ADMIN_ROLES.SUPER_ADMIN,
          isActive: true,
        },
      });
      if (activeSuperAdmins >= 2) {
        return res.status(400).json({ error: 'Maximum of 2 active super admins is allowed' });
      }
    }

    const isLosingSuperAdminRole = account.role === ADMIN_ROLES.SUPER_ADMIN
      && updates.role
      && updates.role !== ADMIN_ROLES.SUPER_ADMIN;
    const isDisablingSuperAdmin = account.role === ADMIN_ROLES.SUPER_ADMIN && updates.isActive === false;
    if (isLosingSuperAdminRole || isDisablingSuperAdmin) {
      const otherSuperAdmins = await countOtherActiveSuperAdmins(account.id);
      if (otherSuperAdmins === 0) {
        return res.status(400).json({ error: 'At least one active super admin account is required' });
      }
    }

    await account.update(updates);
    await log(req, 'admin.update', 'admin_account', account.id, {
      updatedFields: Object.keys(updates).filter((k) => k !== 'passwordHash'),
      passwordUpdated: Boolean(updates.passwordHash),
    });

    res.json({ admin: adminPublic(account) });
  } catch (err) {
    next(err);
  }
}

async function deleteAdminAccount(req, res, next) {
  try {
    const account = await AdminAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ error: 'Admin account not found' });

    if (account.role === ADMIN_ROLES.SUPER_ADMIN) {
      const otherSuperAdmins = await countOtherActiveSuperAdmins(account.id);
      if (otherSuperAdmins === 0) {
        return res.status(400).json({ error: 'At least one active super admin account is required' });
      }
    }

    await AdminSession.update({ isRevoked: true }, { where: { adminId: account.id, isRevoked: false } });
    await account.destroy();
    await log(req, 'admin.delete', 'admin_account', req.params.id);

    res.json({ message: 'Admin account deleted' });
  } catch (err) {
    next(err);
  }
}

async function updateMyCredentials(req, res, next) {
  try {
    const account = await AdminAccount.findByPk(req.admin.id);
    if (!account) return res.status(404).json({ error: 'Admin account not found' });

    const currentPassword = req.body.currentPassword || '';
    const match = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    const updates = {};
    if (req.body.username?.trim()) updates.username = req.body.username.trim();
    if (req.body.phone?.trim()) updates.phone = req.body.phone.trim();
    if (req.body.newPassword) updates.passwordHash = await bcrypt.hash(req.body.newPassword, 12);

    if (!updates.username && !updates.phone && !updates.passwordHash) {
      return res.status(400).json({ error: 'No credential changes provided' });
    }

    if (updates.username || updates.phone) {
      const duplicate = await AdminAccount.findOne({
        where: {
          id: { [Op.ne]: account.id },
          [Op.or]: [
            ...(updates.username ? [{ username: updates.username }] : []),
            ...(updates.phone ? [{ phone: updates.phone }] : []),
          ],
        },
      });
      if (duplicate) return res.status(409).json({ error: 'Username or phone already in use' });
    }

    await account.update(updates);
    await log(req, 'admin.credentials.update', 'admin_account', account.id, {
      updatedFields: Object.keys(updates).filter((k) => k !== 'passwordHash'),
      passwordUpdated: Boolean(updates.passwordHash),
    });

    res.json({ admin: adminPublic(account), message: 'Credentials updated' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  dashboard,
  getBranding,
  updateBranding,
  uploadBrandingAsset,
  getLanding,
  updateLanding,
  uploadLandingAsset,
  listUsers,
  suspendUser,
  restoreUser,
  verifyUser,
  pushUserPasswordReset,
  forceLogoutUser,
  listSupportTickets,
  respondSupportTicket,
  warnUser,
  listReports,
  createReport,
  resolveReport,
  lockChat,
  unlockChat,
  muteUserInGroup,
  removeUserFromGroup,
  deleteGroup,
  removeMessage,
  listFiles,
  flagFile,
  removeFile,
  broadcast,
  listAnnouncements,
  deleteAnnouncement,
  getSettings,
  upsertSetting,
  listSystemConfig,
  upsertSystemConfig,
  listBans,
  createBan,
  removeBan,
  otpMonitoring,
  auditLogs,
  loginIpLogs,
  securityOverview,
  upsertSecurityPolicy,
  backupDatabase,
  restoreDatabase,
  exportUserData,
  deleteUserData,
  listAdminAccounts,
  createAdminAccount,
  updateAdminAccount,
  deleteAdminAccount,
  updateMyCredentials,
};
