require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const { DataTypes } = require('sequelize');

const { sequelize } = require('./config/database');
const routes = require('./routes');
const { initSocket } = require('./socket');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

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

const allowedOrigins = getAllowedOrigins();

// ─── Security Middleware ───────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      mediaSrc: ["'self'", 'blob:'],
    },
  },
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.trim().replace(/\/+$/, '').toLowerCase();
    if (allowedOrigins.includes(normalizedOrigin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── General Middleware ────────────────────────────────────────────────────
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// ─── Static Files ─────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── API Routes ───────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ─── Error Handler ────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Socket.IO ───────────────────────────────────────────────────────────
initSocket(server);

// ─── Start ────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001');

async function ensureLegacySQLiteSchema() {
  if (sequelize.getDialect() !== 'sqlite') {
    return;
  }

  const queryInterface = sequelize.getQueryInterface();
  let userTable;
  let chatMemberTable;
  let messageTable;

  try {
    userTable = await queryInterface.describeTable('Users');
    chatMemberTable = await queryInterface.describeTable('ChatMembers');
    messageTable = await queryInterface.describeTable('Messages');
  } catch (_error) {
    return;
  }

  const ensureColumn = async (columnName, definition) => {
    if (!userTable[columnName]) {
      await queryInterface.addColumn('Users', columnName, definition);
    }
  };

  await ensureColumn('email', { type: DataTypes.STRING(160), allowNull: true });
  await ensureColumn('passwordHash', { type: DataTypes.STRING(120), allowNull: true });
  await ensureColumn('authMethod', { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'otp' });
  await ensureColumn('role', { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'user' });
  await ensureColumn('isSuspended', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
  await ensureColumn('suspendedReason', { type: DataTypes.STRING(255), allowNull: true });
  await ensureColumn('suspendedUntil', { type: DataTypes.DATE, allowNull: true });

  const ensureChatMemberColumn = async (columnName, definition) => {
    if (!chatMemberTable[columnName]) {
      await queryInterface.addColumn('ChatMembers', columnName, definition);
    }
  };

  await ensureChatMemberColumn('isPinned', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
  await ensureChatMemberColumn('pinnedAt', { type: DataTypes.DATE, allowNull: true });
  await ensureChatMemberColumn('isArchived', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
  await ensureChatMemberColumn('notificationsMutedUntil', { type: DataTypes.DATE, allowNull: true });

  const ensureMessageColumn = async (columnName, definition) => {
    if (!messageTable[columnName]) {
      await queryInterface.addColumn('Messages', columnName, definition);
    }
  };

  await ensureMessageColumn('isEdited', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
  await ensureMessageColumn('editedAt', { type: DataTypes.DATE, allowNull: true });

  await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON Users (email)');
}

sequelize.authenticate()
  .then(() => {
    return ensureLegacySQLiteSchema();
  })
  .then(() => {
    const syncOptions = sequelize.getDialect() === 'sqlite'
      ? {}
      : { alter: process.env.NODE_ENV === 'development' };

    return sequelize.sync(syncOptions);
  })
  .then(() => {
    logger.info('Database synced successfully');
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  })
  .catch((err) => {
    logger.error('Database connection failed:', err);
    process.exit(1);
  });

module.exports = { app, server };
