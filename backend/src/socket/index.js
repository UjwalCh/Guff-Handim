const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { User, ChatMember } = require('../models');
const logger = require('../utils/logger');

let io;

function getAllowedOrigins() {
  const raw = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173';

  const normalizeOrigin = (value) => value
    .trim()
    .replace(/\/+$/, '')
    .toLowerCase();

  return raw
    .split(',')
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);
}

function initSocket(server) {
  const allowedOrigins = getAllowedOrigins();

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalizedOrigin = origin.trim().replace(/\/+$/, '').toLowerCase();
        if (allowedOrigins.includes(normalizedOrigin)) return callback(null, true);
        return callback(new Error('CORS origin not allowed'));
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── JWT Auth Guard ──────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({
        where: { id: payload.userId, isActive: true, isVerified: true },
        attributes: ['id', 'name', 'avatar'],
      });
      if (!user) return next(new Error('User not found'));

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    logger.info(`Socket connected: ${userId} (${socket.id})`);

    // ── Join Personal Room ──────────────────────────────────────────────
    socket.join(`user:${userId}`);

    // ── Join All Chat Rooms ─────────────────────────────────────────────
    const memberships = await ChatMember.findAll({
      where: { userId, isActive: true },
      attributes: ['chatId'],
    });
    memberships.forEach(m => socket.join(`chat:${m.chatId}`));

    // ── Mark Online ─────────────────────────────────────────────────────
    await User.update({ isOnline: true, lastSeen: new Date() }, { where: { id: userId } });
    socket.broadcast.emit('user-online', { userId });

    // ── Typing Indicator ────────────────────────────────────────────────
    socket.on('typing', ({ chatId, isTyping }) => {
      socket.to(`chat:${chatId}`).emit('typing', { chatId, userId, isTyping });
    });

    // ── WebRTC Signaling ─────────────────────────────────────────────────
    socket.on('webrtc-offer', ({ targetUserId, offer, type }) => {
      io.to(`user:${targetUserId}`).emit('webrtc-offer', {
        from: userId,
        fromName: socket.user.name,
        fromAvatar: socket.user.avatar,
        offer,
        type,
      });
    });

    socket.on('webrtc-answer', ({ targetUserId, answer }) => {
      io.to(`user:${targetUserId}`).emit('webrtc-answer', { from: userId, answer });
    });

    socket.on('webrtc-ice', ({ targetUserId, candidate }) => {
      io.to(`user:${targetUserId}`).emit('webrtc-ice', { from: userId, candidate });
    });

    socket.on('call-end', ({ targetUserId }) => {
      io.to(`user:${targetUserId}`).emit('call-end', { from: userId });
    });

    socket.on('call-reject', ({ targetUserId }) => {
      io.to(`user:${targetUserId}`).emit('call-rejected', { from: userId });
    });

    // ── Join a new chat room ─────────────────────────────────────────────
    socket.on('join-chat', (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    // ── Disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${userId}`);
      // Only mark offline if no other sockets from same user
      const sockets = await io.in(`user:${userId}`).fetchSockets();
      if (sockets.length === 0) {
        await User.update({ isOnline: false, lastSeen: new Date() }, { where: { id: userId } });
        socket.broadcast.emit('user-offline', { userId, lastSeen: new Date() });
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

module.exports = { initSocket, getIO };
