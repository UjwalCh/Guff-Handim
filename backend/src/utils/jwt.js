const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { RefreshToken } = require('../models');

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY_DAYS = 30;

function generateAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRY });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function generateRefreshToken(userId, deviceInfo = {}) {
  const token = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({ userId, tokenHash, expiresAt, deviceInfo });
  return token;
}

async function rotateRefreshToken(oldToken, userId, deviceInfo = {}) {
  const tokenHash = hashToken(oldToken);
  const existing = await RefreshToken.findOne({
    where: { tokenHash, ...(userId ? { userId } : {}), isRevoked: false },
  });

  if (!existing) throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  if (new Date() > existing.expiresAt) {
    await existing.update({ isRevoked: true });
    throw Object.assign(new Error('Refresh token expired. Please log in again.'), { status: 401 });
  }

  // Revoke old token (token rotation — prevents reuse)
  await existing.update({ isRevoked: true });

  return generateRefreshToken(existing.userId, deviceInfo);
}

async function revokeRefreshToken(token) {
  const tokenHash = hashToken(token);
  await RefreshToken.update({ isRevoked: true }, { where: { tokenHash } });
}

async function revokeAllUserTokens(userId) {
  await RefreshToken.update({ isRevoked: true }, { where: { userId } });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  hashToken,
};
