const { Message, MessageStatus, MessageReaction, Chat, ChatMember, User, StarredMessage } = require('../models');
const { getIO } = require('../socket');

const MESSAGE_EDIT_WINDOW_MINUTES = parseInt(process.env.MESSAGE_EDIT_WINDOW_MINUTES || '15', 10);
const MESSAGE_UNSEND_WINDOW_MINUTES = parseInt(process.env.MESSAGE_UNSEND_WINDOW_MINUTES || '15', 10);

function withinWindow(createdAt, windowMinutes) {
  const maxAgeMs = Math.max(windowMinutes, 1) * 60 * 1000;
  return (Date.now() - new Date(createdAt).getTime()) <= maxAgeMs;
}

async function sendMessage(req, res, next) {
  try {
    const { chatId } = req.params;
    const { encryptedContent, type = 'text', replyToId, isForwarded, fileUrl, fileName, fileSize, mimeType, thumbnailUrl, disappearsAt } = req.body;

    const membership = await ChatMember.findOne({
      where: { chatId, userId: req.user.id, isActive: true },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this chat' });

    const chat = await Chat.findByPk(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    // Calculate disappearing message time
    let disappearsAtDate = null;
    if (chat.disappearingTimer > 0) {
      disappearsAtDate = new Date(Date.now() + chat.disappearingTimer * 1000);
    } else if (disappearsAt) {
      disappearsAtDate = new Date(disappearsAt);
    }

    const message = await Message.create({
      chatId,
      senderId: req.user.id,
      encryptedContent,
      type,
      replyToId: replyToId || null,
      isForwarded: !!isForwarded,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      mimeType: mimeType || null,
      thumbnailUrl: thumbnailUrl || null,
      disappearsAt: disappearsAtDate,
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] },
        { association: 'reactions' },
      ],
    });

    // Emit via Socket.IO to all chat members
    const io = getIO();
    io.to(`chat:${chatId}`).emit('new-message', { message: fullMessage });

    // Create delivered status for all other members
    const members = await ChatMember.findAll({ where: { chatId, isActive: true } });
    const statusEntries = members
      .filter(m => m.userId !== req.user.id)
      .map(m => ({ messageId: message.id, userId: m.userId, status: 'delivered' }));
    if (statusEntries.length) await MessageStatus.bulkCreate(statusEntries, { ignoreDuplicates: true });

    res.status(201).json({ message: fullMessage });
  } catch (err) { next(err); }
}

async function deleteMessage(req, res, next) {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.senderId !== req.user.id) return res.status(403).json({ error: 'Not your message' });
    if (message.isDeleted) return res.status(400).json({ error: 'Message already removed' });
    if (!withinWindow(message.createdAt, MESSAGE_UNSEND_WINDOW_MINUTES)) {
      return res.status(403).json({ error: `Messages can only be unsent within ${MESSAGE_UNSEND_WINDOW_MINUTES} minutes` });
    }

    await message.update({ isDeleted: true, encryptedContent: null, type: 'deleted', fileUrl: null });

    const io = getIO();
    io.to(`chat:${message.chatId}`).emit('message-deleted', { messageId: message.id, chatId: message.chatId });

    res.json({ message: 'Message deleted' });
  } catch (err) { next(err); }
}

async function editMessage(req, res, next) {
  try {
    const message = await Message.findByPk(req.params.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] }],
    });

    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.senderId !== req.user.id) return res.status(403).json({ error: 'Not your message' });
    if (message.isDeleted) return res.status(400).json({ error: 'Cannot edit deleted message' });
    if (message.type !== 'text') return res.status(400).json({ error: 'Only text messages can be edited' });
    if (!withinWindow(message.createdAt, MESSAGE_EDIT_WINDOW_MINUTES)) {
      return res.status(403).json({ error: `Messages can only be edited within ${MESSAGE_EDIT_WINDOW_MINUTES} minutes` });
    }

    const encryptedContent = req.body.encryptedContent;
    if (!encryptedContent) return res.status(400).json({ error: 'encryptedContent is required' });

    await message.update({
      encryptedContent,
      isEdited: true,
      editedAt: new Date(),
    });

    const io = getIO();
    io.to(`chat:${message.chatId}`).emit('message-updated', {
      chatId: message.chatId,
      messageId: message.id,
      updates: {
        encryptedContent: message.encryptedContent,
        isEdited: true,
        editedAt: message.editedAt,
      },
    });

    res.json({ message });
  } catch (err) { next(err); }
}

async function addReaction(req, res, next) {
  try {
    const { emoji } = req.body;
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    // Upsert reaction (update if same user already reacted)
    await MessageReaction.destroy({ where: { messageId: message.id, userId: req.user.id } });
    await MessageReaction.create({ messageId: message.id, userId: req.user.id, emoji });

    const reactions = await MessageReaction.findAll({
      where: { messageId: message.id },
      include: [{ model: User, as: 'reactor', attributes: ['id', 'name'] }],
    });

    const io = getIO();
    io.to(`chat:${message.chatId}`).emit('reaction-update', { messageId: message.id, reactions });

    res.json({ reactions });
  } catch (err) { next(err); }
}

async function removeReaction(req, res, next) {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    await MessageReaction.destroy({ where: { messageId: message.id, userId: req.user.id } });

    const reactions = await MessageReaction.findAll({
      where: { messageId: message.id },
      include: [{ model: User, as: 'reactor', attributes: ['id', 'name'] }],
    });

    const io = getIO();
    io.to(`chat:${message.chatId}`).emit('reaction-update', { messageId: message.id, reactions });

    res.json({ reactions });
  } catch (err) { next(err); }
}

async function starMessage(req, res, next) {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const membership = await ChatMember.findOne({
      where: { chatId: message.chatId, userId: req.user.id, isActive: true },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this chat' });

    await StarredMessage.findOrCreate({
      where: { messageId: message.id, userId: req.user.id },
      defaults: { messageId: message.id, userId: req.user.id },
    });

    const starredBy = await StarredMessage.findAll({ where: { messageId: message.id }, attributes: ['userId', 'messageId'] });
    res.json({ messageId: message.id, starred: true, starredBy });
  } catch (err) { next(err); }
}

async function unstarMessage(req, res, next) {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    await StarredMessage.destroy({ where: { messageId: message.id, userId: req.user.id } });
    const starredBy = await StarredMessage.findAll({ where: { messageId: message.id }, attributes: ['userId', 'messageId'] });
    res.json({ messageId: message.id, starred: false, starredBy });
  } catch (err) { next(err); }
}

async function listStarredMessages(req, res, next) {
  try {
    const starred = await StarredMessage.findAll({
      where: { userId: req.user.id },
      include: [{
        model: Message,
        as: 'message',
        where: {
          ...(req.query.chatId ? { chatId: req.query.chatId } : {}),
        },
        include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] }],
      }],
      order: [['createdAt', 'DESC']],
      limit: 300,
    });

    res.json({ messages: starred.map((entry) => entry.message).filter(Boolean) });
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    const { chatId, messageIds } = req.body;
    if (!messageIds || !messageIds.length) return res.status(400).json({ error: 'No messageIds provided' });

    await MessageStatus.bulkCreate(
      messageIds.map(id => ({ messageId: id, userId: req.user.id, status: 'read', timestamp: new Date() })),
      { updateOnDuplicate: ['status', 'timestamp'] }
    );

    const io = getIO();
    io.to(`chat:${chatId}`).emit('messages-read', { chatId, messageIds, readBy: req.user.id });

    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
}

module.exports = {
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  starMessage,
  unstarMessage,
  listStarredMessages,
  markRead,
};
