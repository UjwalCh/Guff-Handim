const { Message, MessageStatus, MessageReaction, Chat, ChatMember, User } = require('../models');
const { getIO } = require('../socket');

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

    await message.update({ isDeleted: true, encryptedContent: null, type: 'deleted', fileUrl: null });

    const io = getIO();
    io.to(`chat:${message.chatId}`).emit('message-deleted', { messageId: message.id, chatId: message.chatId });

    res.json({ message: 'Message deleted' });
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

module.exports = { sendMessage, deleteMessage, addReaction, removeReaction, markRead };
