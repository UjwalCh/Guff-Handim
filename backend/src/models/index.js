const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// ─── USER ─────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  phone:      { type: DataTypes.STRING(20), allowNull: false, unique: true },
  email:      { type: DataTypes.STRING(160), allowNull: true, unique: true },
  name:       { type: DataTypes.STRING(100), allowNull: true },
  avatar:     { type: DataTypes.STRING(500), allowNull: true },
  bio:        { type: DataTypes.STRING(500), allowNull: true, defaultValue: 'Hey there! I am using Guff Handim.' },
  publicKey:  { type: DataTypes.TEXT, allowNull: true },    // X25519 public key (base64)
  passwordHash: { type: DataTypes.STRING(120), allowNull: true },
  authMethod: { type: DataTypes.ENUM('otp', 'password', 'hybrid'), defaultValue: 'otp' },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  isOnline:   { type: DataTypes.BOOLEAN, defaultValue: false },
  lastSeen:   { type: DataTypes.DATE, allowNull: true },
  isActive:   { type: DataTypes.BOOLEAN, defaultValue: true },
  role:       { type: DataTypes.ENUM('user', 'super_admin'), defaultValue: 'user' },
  isSuspended:{ type: DataTypes.BOOLEAN, defaultValue: false },
  suspendedReason: { type: DataTypes.STRING(255), allowNull: true },
  suspendedUntil:  { type: DataTypes.DATE, allowNull: true },
});

// ─── ADMIN ACCOUNT ────────────────────────────────────────────────────────
const AdminAccount = sequelize.define('AdminAccount', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  username:         { type: DataTypes.STRING(80), allowNull: false, unique: true },
  phone:            { type: DataTypes.STRING(20), allowNull: false, unique: true },
  passwordHash:     { type: DataTypes.STRING(80), allowNull: false },
  role:             { type: DataTypes.ENUM('super_admin', 'moderator', 'support', 'security', 'admin'), defaultValue: 'moderator' },
  isActive:         { type: DataTypes.BOOLEAN, defaultValue: true },
  require2FA:       { type: DataTypes.BOOLEAN, defaultValue: true },
  failedAttempts:   { type: DataTypes.INTEGER, defaultValue: 0 },
  lockedUntil:      { type: DataTypes.DATE, allowNull: true },
  ipAllowlist:      { type: DataTypes.JSON, allowNull: true },
  lastLoginAt:      { type: DataTypes.DATE, allowNull: true },
  lastLoginIp:      { type: DataTypes.STRING(64), allowNull: true },
});

const AdminSession = sequelize.define('AdminSession', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  adminId:          { type: DataTypes.UUID, allowNull: false },
  tokenHash:        { type: DataTypes.STRING(128), allowNull: false, unique: true },
  ipAddress:        { type: DataTypes.STRING(64), allowNull: true },
  userAgent:        { type: DataTypes.STRING(500), allowNull: true },
  expiresAt:        { type: DataTypes.DATE, allowNull: false },
  isRevoked:        { type: DataTypes.BOOLEAN, defaultValue: false },
});

const AdminAuditLog = sequelize.define('AdminAuditLog', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  adminId:          { type: DataTypes.UUID, allowNull: true },
  action:           { type: DataTypes.STRING(120), allowNull: false },
  resourceType:     { type: DataTypes.STRING(60), allowNull: false },
  resourceId:       { type: DataTypes.STRING(100), allowNull: true },
  metadata:         { type: DataTypes.JSON, allowNull: true },
  ipAddress:        { type: DataTypes.STRING(64), allowNull: true },
});

// ─── CHAT ─────────────────────────────────────────────────────────────────
const Chat = sequelize.define('Chat', {
  id:                { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  isGroup:           { type: DataTypes.BOOLEAN, defaultValue: false },
  name:              { type: DataTypes.STRING(100), allowNull: true },
  avatar:            { type: DataTypes.STRING(500), allowNull: true },
  description:       { type: DataTypes.STRING(500), allowNull: true },
  createdBy:         { type: DataTypes.UUID, allowNull: true },
  disappearingTimer: { type: DataTypes.INTEGER, defaultValue: 0 },  // seconds; 0 = off
  inviteCode:        { type: DataTypes.STRING(32), allowNull: true, unique: true },
});

// ─── CHAT MEMBER ──────────────────────────────────────────────────────────
const ChatMember = sequelize.define('ChatMember', {
  chatId:            { type: DataTypes.UUID, primaryKey: true },
  userId:            { type: DataTypes.UUID, primaryKey: true },
  role:              { type: DataTypes.ENUM('member', 'admin'), defaultValue: 'member' },
  mutedUntil:        { type: DataTypes.DATE, allowNull: true },
  isPinned:          { type: DataTypes.BOOLEAN, defaultValue: false },
  pinnedAt:          { type: DataTypes.DATE, allowNull: true },
  isArchived:        { type: DataTypes.BOOLEAN, defaultValue: false },
  isActive:          { type: DataTypes.BOOLEAN, defaultValue: true },
  joinedAt:          { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  // Group E2EE: group symmetric key encrypted with this member's public key (stored as JSON {nonce, ciphertext})
  encryptedGroupKey: { type: DataTypes.TEXT('long'), allowNull: true },
});

// ─── MESSAGE ──────────────────────────────────────────────────────────────
const Message = sequelize.define('Message', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  chatId:           { type: DataTypes.UUID, allowNull: false },
  senderId:         { type: DataTypes.UUID, allowNull: false },
  // JSON string: { nonce, ciphertext } — server never sees plaintext
  encryptedContent: { type: DataTypes.TEXT('long'), allowNull: true },
  type:             { type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'file', 'deleted'), defaultValue: 'text' },
  fileUrl:          { type: DataTypes.STRING(500), allowNull: true },
  fileName:         { type: DataTypes.STRING(255), allowNull: true },
  fileSize:         { type: DataTypes.BIGINT, allowNull: true },
  mimeType:         { type: DataTypes.STRING(100), allowNull: true },
  thumbnailUrl:     { type: DataTypes.STRING(500), allowNull: true },
  replyToId:        { type: DataTypes.UUID, allowNull: true },
  isForwarded:      { type: DataTypes.BOOLEAN, defaultValue: false },
  isEdited:         { type: DataTypes.BOOLEAN, defaultValue: false },
  editedAt:         { type: DataTypes.DATE, allowNull: true },
  isDeleted:        { type: DataTypes.BOOLEAN, defaultValue: false },
  disappearsAt:     { type: DataTypes.DATE, allowNull: true },
});

// ─── MESSAGE STATUS ───────────────────────────────────────────────────────
const MessageStatus = sequelize.define('MessageStatus', {
  messageId: { type: DataTypes.UUID, primaryKey: true },
  userId:    { type: DataTypes.UUID, primaryKey: true },
  status:    { type: DataTypes.ENUM('delivered', 'read'), defaultValue: 'delivered' },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { timestamps: false });

// ─── MESSAGE REACTION ─────────────────────────────────────────────────────
const MessageReaction = sequelize.define('MessageReaction', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  messageId: { type: DataTypes.UUID, allowNull: false },
  userId:    { type: DataTypes.UUID, allowNull: false },
  emoji:     { type: DataTypes.STRING(10), allowNull: false },
});

// ─── STARRED MESSAGE ──────────────────────────────────────────────────────
const StarredMessage = sequelize.define('StarredMessage', {
  messageId: { type: DataTypes.UUID, primaryKey: true },
  userId:    { type: DataTypes.UUID, primaryKey: true },
});

// ─── STATUS / STORY ───────────────────────────────────────────────────────
const Status = sequelize.define('Status', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:           { type: DataTypes.UUID, allowNull: false },
  type:             { type: DataTypes.ENUM('text', 'image', 'video'), defaultValue: 'text' },
  encryptedContent: { type: DataTypes.TEXT('long'), allowNull: true },
  mediaUrl:         { type: DataTypes.STRING(500), allowNull: true },
  backgroundColor:  { type: DataTypes.STRING(20), defaultValue: '#128C7E' },
  expiresAt:        { type: DataTypes.DATE, allowNull: false },
});

// ─── STATUS VIEW ──────────────────────────────────────────────────────────
const StatusView = sequelize.define('StatusView', {
  statusId: { type: DataTypes.UUID, primaryKey: true },
  viewerId: { type: DataTypes.UUID, primaryKey: true },
  viewedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { timestamps: false });

// ─── OTP ──────────────────────────────────────────────────────────────────
const OTP = sequelize.define('OTP', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  phone:     { type: DataTypes.STRING(20), allowNull: false },
  otpHash:   { type: DataTypes.STRING(60), allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  attempts:  { type: DataTypes.INTEGER, defaultValue: 0 },
  isUsed:    { type: DataTypes.BOOLEAN, defaultValue: false },
});

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────
const RefreshToken = sequelize.define('RefreshToken', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:     { type: DataTypes.UUID, allowNull: false },
  tokenHash:  { type: DataTypes.STRING(64), allowNull: false },
  expiresAt:  { type: DataTypes.DATE, allowNull: false },
  deviceInfo: { type: DataTypes.JSON, allowNull: true },
  isRevoked:  { type: DataTypes.BOOLEAN, defaultValue: false },
});

// ─── PUSH TOKEN ───────────────────────────────────────────────────────────
const PushToken = sequelize.define('PushToken', {
  id:       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:   { type: DataTypes.UUID, allowNull: false },
  token:    { type: DataTypes.TEXT, allowNull: false },
  platform: { type: DataTypes.ENUM('web', 'ios', 'android'), defaultValue: 'web' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
});

// ─── BLOCK ────────────────────────────────────────────────────────────────
const Block = sequelize.define('Block', {
  blockerId: { type: DataTypes.UUID, primaryKey: true },
  blockedId: { type: DataTypes.UUID, primaryKey: true },
}, { timestamps: true, updatedAt: false });

// ─── ADMIN DOMAIN ────────────────────────────────────────────────────────
const Report = sequelize.define('Report', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  reporterId:       { type: DataTypes.UUID, allowNull: true },
  targetType:       { type: DataTypes.ENUM('user', 'message', 'status', 'file'), allowNull: false },
  targetId:         { type: DataTypes.STRING(100), allowNull: false },
  reason:           { type: DataTypes.STRING(300), allowNull: false },
  details:          { type: DataTypes.TEXT, allowNull: true },
  status:           { type: DataTypes.ENUM('open', 'reviewing', 'resolved', 'rejected'), defaultValue: 'open' },
  reviewedBy:       { type: DataTypes.UUID, allowNull: true },
  reviewNotes:      { type: DataTypes.TEXT, allowNull: true },
});

const FileModeration = sequelize.define('FileModeration', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  messageId:        { type: DataTypes.UUID, allowNull: false, unique: true },
  status:           { type: DataTypes.ENUM('clean', 'flagged', 'removed'), defaultValue: 'clean' },
  reason:           { type: DataTypes.STRING(300), allowNull: true },
  reviewedBy:       { type: DataTypes.UUID, allowNull: true },
});

const Announcement = sequelize.define('Announcement', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:            { type: DataTypes.STRING(120), allowNull: false },
  message:          { type: DataTypes.TEXT, allowNull: false },
  activeFrom:       { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  activeTo:         { type: DataTypes.DATE, allowNull: true },
  createdBy:        { type: DataTypes.UUID, allowNull: false },
});

const SystemSetting = sequelize.define('SystemSetting', {
  key:              { type: DataTypes.STRING(100), primaryKey: true },
  value:            { type: DataTypes.JSON, allowNull: false },
  updatedBy:        { type: DataTypes.UUID, allowNull: true },
}, { timestamps: true });

const BanList = sequelize.define('BanList', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type:             { type: DataTypes.ENUM('phone', 'ip', 'device'), allowNull: false },
  value:            { type: DataTypes.STRING(255), allowNull: false, unique: true },
  reason:           { type: DataTypes.STRING(300), allowNull: false },
  expiresAt:        { type: DataTypes.DATE, allowNull: true },
  createdBy:        { type: DataTypes.UUID, allowNull: false },
});

// ─── ASSOCIATIONS ─────────────────────────────────────────────────────────
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

Chat.hasMany(Message, { foreignKey: 'chatId', as: 'messages' });
Message.belongsTo(Chat, { foreignKey: 'chatId', as: 'chat' });

Chat.belongsToMany(User, { through: ChatMember, foreignKey: 'chatId', as: 'members' });
User.belongsToMany(Chat, { through: ChatMember, foreignKey: 'userId', as: 'chats' });

Chat.hasMany(ChatMember, { foreignKey: 'chatId', as: 'chatMembers' });
ChatMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ChatMember.belongsTo(Chat, { foreignKey: 'chatId', as: 'chat' });

Message.hasMany(MessageReaction, { foreignKey: 'messageId', as: 'reactions' });
MessageReaction.belongsTo(Message, { foreignKey: 'messageId' });
MessageReaction.belongsTo(User, { foreignKey: 'userId', as: 'reactor' });

Message.hasMany(StarredMessage, { foreignKey: 'messageId', as: 'starredBy' });
StarredMessage.belongsTo(Message, { foreignKey: 'messageId', as: 'message' });
StarredMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Message.hasMany(MessageStatus, { foreignKey: 'messageId', as: 'readReceipts' });

User.hasMany(Status, { foreignKey: 'userId', as: 'statuses' });
Status.belongsTo(User, { foreignKey: 'userId', as: 'author' });
Status.hasMany(StatusView, { foreignKey: 'statusId', as: 'views' });

User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
User.hasMany(PushToken, { foreignKey: 'userId', as: 'pushTokens' });
User.hasMany(Block, { foreignKey: 'blockerId', as: 'blocks' });
Block.belongsTo(User, { foreignKey: 'blockedId', as: 'blocked' });

AdminAccount.hasMany(AdminSession, { foreignKey: 'adminId', as: 'sessions' });
AdminSession.belongsTo(AdminAccount, { foreignKey: 'adminId', as: 'admin' });

AdminAccount.hasMany(AdminAuditLog, { foreignKey: 'adminId', as: 'auditLogs' });
AdminAuditLog.belongsTo(AdminAccount, { foreignKey: 'adminId', as: 'admin' });

Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
Report.belongsTo(AdminAccount, { foreignKey: 'reviewedBy', as: 'reviewer' });

FileModeration.belongsTo(Message, { foreignKey: 'messageId', as: 'message' });
FileModeration.belongsTo(AdminAccount, { foreignKey: 'reviewedBy', as: 'reviewer' });

Announcement.belongsTo(AdminAccount, { foreignKey: 'createdBy', as: 'creator' });

module.exports = {
  sequelize,
  User,
  Chat,
  ChatMember,
  Message,
  MessageStatus,
  MessageReaction,
  StarredMessage,
  Status,
  StatusView,
  OTP,
  RefreshToken,
  PushToken,
  Block,
  AdminAccount,
  AdminSession,
  AdminAuditLog,
  Report,
  FileModeration,
  Announcement,
  SystemSetting,
  BanList,
};
