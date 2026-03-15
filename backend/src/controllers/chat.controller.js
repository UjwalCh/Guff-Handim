const { Op } = require('sequelize');
const { Chat, ChatMember, Message, User, Block, sequelize } = require('../models');
const { paginate } = require('../utils/helpers');

async function getMyChats(req, res, next) {
  try {
    const memberships = await ChatMember.findAll({
      where: { userId: req.user.id, isActive: true },
      include: [{
        model: Chat,
        as: 'chat',
        include: [
          {
            model: User,
            as: 'members',
            through: { attributes: ['role', 'encryptedGroupKey'] },
            attributes: ['id', 'name', 'avatar', 'isOnline', 'lastSeen'],
          },
          {
            model: Message,
            as: 'messages',
            limit: 1,
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'senderId', 'encryptedContent', 'type', 'fileUrl', 'createdAt', 'isDeleted'],
          },
        ],
      }],
      order: [[{ model: Chat, as: 'chat' }, { model: Message, as: 'messages' }, 'createdAt', 'DESC']],
    });

    const chats = memberships
      .filter(m => m.chat)
      .map(m => ({
        ...m.chat.toJSON(),
        myRole: m.role,
        myEncryptedGroupKey: m.encryptedGroupKey,
      }));

    res.json({ chats });
  } catch (err) { next(err); }
}

async function createOrGetDirectChat(req, res, next) {
  try {
    const { targetUserId } = req.body;
    if (targetUserId === req.user.id) return res.status(400).json({ error: 'Cannot chat with yourself' });

    // Check if blocked
    const isBlocked = await Block.findOne({
      where: {
        [Op.or]: [
          { blockerId: req.user.id, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: req.user.id },
        ],
      },
    });
    if (isBlocked) return res.status(403).json({ error: 'Cannot start chat — user is blocked' });

    // Look for an existing 1:1 chat between the two users
    const existing = await sequelize.query(
      `SELECT cm1.chatId FROM ChatMembers cm1
       INNER JOIN ChatMembers cm2 ON cm1.chatId = cm2.chatId
       INNER JOIN Chats c ON c.id = cm1.chatId
       WHERE cm1.userId = :uid1 AND cm2.userId = :uid2
         AND c.isGroup = 0 AND cm1.isActive = 1 AND cm2.isActive = 1
       LIMIT 1`,
      { replacements: { uid1: req.user.id, uid2: targetUserId }, type: sequelize.QueryTypes.SELECT }
    );

    if (existing.length > 0) {
      const chat = await Chat.findByPk(existing[0].chatId, {
        include: [{ model: User, as: 'members', attributes: ['id', 'name', 'avatar', 'isOnline', 'publicKey'] }],
      });
      return res.json({ chat, isNew: false });
    }

    // Create new direct chat
    const chat = await Chat.create({ isGroup: false });
    await ChatMember.bulkCreate([
      { chatId: chat.id, userId: req.user.id, role: 'admin' },
      { chatId: chat.id, userId: targetUserId, role: 'admin' },
    ]);

    const fullChat = await Chat.findByPk(chat.id, {
      include: [{ model: User, as: 'members', attributes: ['id', 'name', 'avatar', 'isOnline', 'publicKey'] }],
    });

    res.status(201).json({ chat: fullChat, isNew: true });
  } catch (err) { next(err); }
}

async function getChatById(req, res, next) {
  try {
    const membership = await ChatMember.findOne({
      where: { chatId: req.params.id, userId: req.user.id, isActive: true },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this chat' });

    const chat = await Chat.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'members',
        through: { attributes: ['role', 'isActive', 'joinedAt', 'encryptedGroupKey'] },
        attributes: ['id', 'name', 'avatar', 'isOnline', 'lastSeen', 'publicKey'],
      }],
    });

    res.json({ chat, myEncryptedGroupKey: membership.encryptedGroupKey });
  } catch (err) { next(err); }
}

async function getChatMessages(req, res, next) {
  try {
    const membership = await ChatMember.findOne({
      where: { chatId: req.params.id, userId: req.user.id, isActive: true },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this chat' });

    const { limit, offset } = paginate(req.query);

    const messages = await Message.findAll({
      where: {
        chatId: req.params.id,
        ...(req.query.before ? { createdAt: { [Op.lt]: new Date(req.query.before) } } : {}),
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] },
        { association: 'reactions', include: [{ model: User, as: 'reactor', attributes: ['id', 'name'] }] },
        { association: 'readReceipts', attributes: ['userId', 'status', 'timestamp'] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({ messages: messages.reverse() });
  } catch (err) { next(err); }
}

async function updateChatSettings(req, res, next) {
  try {
    const { disappearingTimer } = req.body;
    const membership = await ChatMember.findOne({
      where: { chatId: req.params.id, userId: req.user.id, isActive: true },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    await Chat.update({ disappearingTimer }, { where: { id: req.params.id } });
    res.json({ message: 'Settings updated' });
  } catch (err) { next(err); }
}

module.exports = { getMyChats, createOrGetDirectChat, getChatById, getChatMessages, updateChatSettings };
