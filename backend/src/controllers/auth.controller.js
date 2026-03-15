const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, RefreshToken } = require('../models');
const { sendOTP, verifyOTP } = require('../utils/otp');
const { generateAccessToken, generateRefreshToken, rotateRefreshToken, revokeRefreshToken, hashToken } = require('../utils/jwt');
const { normalizePhone, sanitizeUser } = require('../utils/helpers');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/api/auth',
};

async function sendOTPHandler(req, res, next) {
  try {
    const phone = normalizePhone(req.body.phone);
    await sendOTP(phone);
    res.json({ message: 'OTP sent successfully' });
  } catch (err) { next(err); }
}

async function verifyOTPHandler(req, res, next) {
  try {
    const phone = normalizePhone(req.body.phone);
    const { otp } = req.body;

    await verifyOTP(phone, otp);

    // Find or create user
    const [user, isNew] = await User.findOrCreate({
      where: { phone },
      defaults: { phone, isVerified: true, authMethod: 'otp' },
    });

    if (!user.isVerified) await user.update({ isVerified: true });

    const accessToken = generateAccessToken(user.id);
    const deviceInfo = {
      ua: req.headers['user-agent'],
      ip: req.ip,
    };
    const refreshToken = await generateRefreshToken(user.id, deviceInfo);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);

    res.json({
      accessToken,
      user: sanitizeUser(user),
      isNewUser: isNew || !user.name,
    });
  } catch (err) { next(err); }
}

async function signUpHandler(req, res, next) {
  try {
    const phone = normalizePhone(req.body.phone);
    const email = req.body.email?.trim().toLowerCase() || null;
    const name = req.body.name?.trim();
    const password = req.body.password;

    const existing = await User.findOne({
      where: {
        [Op.or]: [
          { phone },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existing) return res.status(409).json({ error: 'Account already exists for this phone or email' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      phone,
      email,
      name,
      passwordHash,
      authMethod: 'hybrid',
      isVerified: true,
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id, { ua: req.headers['user-agent'], ip: req.ip });
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);

    res.status(201).json({ accessToken, user: sanitizeUser(user) });
  } catch (err) { next(err); }
}

async function loginWithPasswordHandler(req, res, next) {
  try {
    const identifier = req.body.identifier?.trim().toLowerCase();
    const password = req.body.password;
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { phone: req.body.identifier?.trim() },
        ],
        isActive: true,
      },
    });

    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.isSuspended) return res.status(403).json({ error: 'Account is suspended' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id, { ua: req.headers['user-agent'], ip: req.ip });
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);

    await user.update({ authMethod: user.authMethod === 'otp' ? 'hybrid' : user.authMethod });
    res.json({ accessToken, user: sanitizeUser(user) });
  } catch (err) { next(err); }
}

async function requestPasswordResetHandler(req, res, next) {
  try {
    const identifier = req.body.identifier?.trim().toLowerCase();
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { phone: req.body.identifier?.trim() },
        ],
      },
    });

    if (!user) return res.json({ message: 'If the account exists, an OTP has been sent.' });

    await sendOTP(user.phone);
    res.json({ message: 'If the account exists, an OTP has been sent.' });
  } catch (err) { next(err); }
}

async function resetPasswordHandler(req, res, next) {
  try {
    const identifier = req.body.identifier?.trim().toLowerCase();
    const newPassword = req.body.newPassword;
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { phone: req.body.identifier?.trim() },
        ],
      },
    });

    if (!user) return res.status(404).json({ error: 'Account not found' });

    await verifyOTP(user.phone, req.body.otp);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await user.update({ passwordHash, authMethod: user.authMethod === 'otp' ? 'hybrid' : user.authMethod, isVerified: true });
    await RefreshToken.update({ isRevoked: true }, { where: { userId: user.id } });

    res.json({ message: 'Password reset successful. Please log in.' });
  } catch (err) { next(err); }
}

async function setupProfileHandler(req, res, next) {
  try {
    const { name, publicKey, bio } = req.body;
    const userId = req.user.id;

    const updates = {};
    if (name) updates.name = name.trim().slice(0, 100);
    if (publicKey) updates.publicKey = publicKey;
    if (bio !== undefined) updates.bio = bio.slice(0, 500);

    if (req.file) {
      updates.avatar = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByPk(userId);
    await user.update(updates);

    res.json({ user: sanitizeUser(user) });
  } catch (err) { next(err); }
}

async function refreshTokenHandler(req, res, next) {
  try {
    const oldToken = req.cookies.refreshToken;
    if (!oldToken) return res.status(401).json({ error: 'No refresh token' });

    const deviceInfo = { ua: req.headers['user-agent'], ip: req.ip };
    const newRefreshToken = await rotateRefreshToken(oldToken, null, deviceInfo);

    const tokenRec = await RefreshToken.findOne({ where: { tokenHash: hashToken(newRefreshToken) } });

    const accessToken = generateAccessToken(tokenRec.userId);

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTS);
    res.json({ accessToken });
  } catch (err) { next(err); }
}

async function logoutHandler(req, res, next) {
  try {
    const token = req.cookies.refreshToken;
    if (token) await revokeRefreshToken(token);

    // Mark user offline
    await User.update(
      { isOnline: false, lastSeen: new Date() },
      { where: { id: req.user.id } }
    );

    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
}

module.exports = {
  sendOTPHandler,
  verifyOTPHandler,
  signUpHandler,
  loginWithPasswordHandler,
  requestPasswordResetHandler,
  resetPasswordHandler,
  setupProfileHandler,
  refreshTokenHandler,
  logoutHandler,
};
