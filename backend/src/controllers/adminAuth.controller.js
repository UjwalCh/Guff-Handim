const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { AdminAccount, AdminSession, AdminAuditLog } = require('../models');
const { sendOTP, verifyOTP } = require('../utils/otp');
const { hashToken } = require('../middleware/adminAuth');

const ADMIN_ACCESS_EXPIRY_HOURS = 12;

function generateAdminToken(adminId) {
  return jwt.sign(
    { adminId, scope: 'admin' },
    process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET,
    { expiresIn: `${ADMIN_ACCESS_EXPIRY_HOURS}h` }
  );
}

async function audit(req, action, resourceType, resourceId, metadata) {
  await AdminAuditLog.create({
    adminId: req.admin?.id || null,
    action,
    resourceType,
    resourceId: resourceId || null,
    metadata: metadata || null,
    ipAddress: req.ip,
  });
}

async function bootstrapAdmin() {
  const username = process.env.ADMIN_USERNAME || 'owner';
  const phone = process.env.ADMIN_PHONE || '+10000000000';
  const plainPassword = process.env.ADMIN_PASSWORD || 'ChangeMe!12345';

  const existing = await AdminAccount.findOne({ where: { username } });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(plainPassword, 12);
  return AdminAccount.create({
    username,
    phone,
    passwordHash,
    role: 'super_admin',
    require2FA: true,
    isActive: true,
  });
}

async function adminLogin(req, res, next) {
  try {
    const { username, password } = req.body;
    const admin = await bootstrapAdmin();

    const match = await AdminAccount.findOne({ where: { username } });
    if (!match || !match.isActive) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    if (match.lockedUntil && new Date() < match.lockedUntil) {
      return res.status(423).json({ error: 'Account temporarily locked due to failed attempts' });
    }

    if (Array.isArray(match.ipAllowlist) && match.ipAllowlist.length > 0) {
      if (!match.ipAllowlist.includes(req.ip)) {
        return res.status(403).json({ error: 'IP not allowed for admin login' });
      }
    }

    const ok = await bcrypt.compare(password || '', match.passwordHash);
    if (!ok) {
      const attempts = (match.failedAttempts || 0) + 1;
      const lock = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await match.update({ failedAttempts: attempts % 5, lockedUntil: lock });
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    await match.update({ failedAttempts: 0, lockedUntil: null });

    if (match.require2FA) {
      await sendOTP(match.phone);
      return res.json({
        requires2FA: true,
        message: 'OTP sent to admin phone. Verify to complete login.',
      });
    }

    const token = generateAdminToken(match.id);
    const expiresAt = new Date(Date.now() + ADMIN_ACCESS_EXPIRY_HOURS * 60 * 60 * 1000);

    await AdminSession.create({
      adminId: match.id,
      tokenHash: hashToken(token),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
      expiresAt,
    });

    await match.update({ lastLoginAt: new Date(), lastLoginIp: req.ip });

    return res.json({ token, admin: { id: match.id, username: match.username, role: match.role } });
  } catch (err) {
    next(err);
  }
}

async function verifyAdminOTP(req, res, next) {
  try {
    const { username, otp } = req.body;
    const admin = await AdminAccount.findOne({ where: { username, isActive: true } });
    if (!admin) return res.status(404).json({ error: 'Admin account not found' });

    await verifyOTP(admin.phone, otp);

    const token = generateAdminToken(admin.id);
    const expiresAt = new Date(Date.now() + ADMIN_ACCESS_EXPIRY_HOURS * 60 * 60 * 1000);

    await AdminSession.create({
      adminId: admin.id,
      tokenHash: hashToken(token),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
      expiresAt,
    });

    await admin.update({ lastLoginAt: new Date(), lastLoginIp: req.ip });

    res.json({ token, admin: { id: admin.id, username: admin.username, role: admin.role } });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    res.json({ admin: req.admin });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await req.adminSession.update({ isRevoked: true });
    await audit(req, 'admin.logout', 'session', req.adminSession.id);
    res.json({ message: 'Admin logged out' });
  } catch (err) {
    next(err);
  }
}

async function listSessions(req, res, next) {
  try {
    const sessions = await AdminSession.findAll({
      where: {
        adminId: req.admin.id,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'DESC']],
      limit: 30,
      attributes: ['id', 'ipAddress', 'userAgent', 'createdAt', 'expiresAt', 'isRevoked'],
    });
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

async function revokeSession(req, res, next) {
  try {
    const session = await AdminSession.findOne({
      where: { id: req.params.id, adminId: req.admin.id },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    await session.update({ isRevoked: true });
    await audit(req, 'admin.session.revoke', 'session', session.id);
    res.json({ message: 'Session revoked' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  bootstrapAdmin,
  adminLogin,
  verifyAdminOTP,
  me,
  logout,
  listSessions,
  revokeSession,
};
