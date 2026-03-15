const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { AdminAccount, AdminSession } = require('../models');
const { ADMIN_ROLES } = require('../constants/adminRoles');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Admin token missing' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET);

    const session = await AdminSession.findOne({
      where: { tokenHash: hashToken(token), isRevoked: false },
    });

    if (!session || new Date() > session.expiresAt) {
      return res.status(401).json({ error: 'Admin session expired' });
    }

    const admin = await AdminAccount.findOne({
      where: { id: payload.adminId, isActive: true },
      attributes: ['id', 'username', 'phone', 'role', 'require2FA'],
    });

    if (!admin) return res.status(401).json({ error: 'Admin account not found' });

    req.admin = admin;
    req.adminToken = token;
    req.adminSession = session;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Admin token expired' });
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid admin token' });
    next(err);
  }
}

function requireSuperAdmin(req, res, next) {
  if (!req.admin || req.admin.role !== ADMIN_ROLES.SUPER_ADMIN) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  return next();
}

function requireAdminRoles(roles = []) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: 'Admin authentication required' });
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Insufficient admin permissions' });
    }
    return next();
  };
}

module.exports = { authenticateAdmin, requireSuperAdmin, requireAdminRoles, hashToken };
