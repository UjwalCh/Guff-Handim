const { Op } = require('sequelize');
const { Status, StatusView, User, ChatMember } = require('../models');
const { getIO } = require('../socket');

async function getStatuses(req, res, next) {
  try {
    // Fetch statuses from contacts (users who share a chat with the requester)
    const myChats = await ChatMember.findAll({
      where: { userId: req.user.id, isActive: true },
      attributes: ['chatId'],
    });
    const chatIds = myChats.map(m => m.chatId);

    const contactIds = (await ChatMember.findAll({
      where: { chatId: chatIds, isActive: true },
      attributes: ['userId'],
    })).map(m => m.userId).filter(id => id !== req.user.id);

    const uniqueContactIds = [...new Set(contactIds)];

    const statuses = await Status.findAll({
      where: {
        userId: [req.user.id, ...uniqueContactIds],
        expiresAt: { [Op.gt]: new Date() },
      },
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'avatar'] },
        { association: 'views', attributes: ['viewerId', 'viewedAt'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ statuses });
  } catch (err) { next(err); }
}

async function createStatus(req, res, next) {
  try {
    const { type = 'text', encryptedContent, backgroundColor } = req.body;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const statusData = {
      userId: req.user.id,
      type,
      expiresAt,
    };

    if (type === 'text') {
      statusData.encryptedContent = encryptedContent;
      statusData.backgroundColor = backgroundColor || '#128C7E';
    } else if (req.file) {
      statusData.mediaUrl = `/uploads/${req.file.filename}`;
      if (encryptedContent) statusData.encryptedContent = encryptedContent;
    } else {
      return res.status(400).json({ error: 'Media file required for image/video status' });
    }

    const status = await Status.create(statusData);
    const full = await Status.findByPk(status.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'avatar'] }],
    });

    const io = getIO();
    io.to(`user:${req.user.id}`).emit('new-status', { status: full });

    res.status(201).json({ status: full });
  } catch (err) { next(err); }
}

async function viewStatus(req, res, next) {
  try {
    const status = await Status.findByPk(req.params.id);
    if (!status) return res.status(404).json({ error: 'Status not found' });
    if (new Date() > status.expiresAt) return res.status(410).json({ error: 'Status expired' });

    await StatusView.upsert({ statusId: status.id, viewerId: req.user.id, viewedAt: new Date() });

    const io = getIO();
    io.to(`user:${status.userId}`).emit('status-viewed', { statusId: status.id, viewerId: req.user.id });

    res.json({ message: 'Viewed' });
  } catch (err) { next(err); }
}

async function deleteStatus(req, res, next) {
  try {
    const status = await Status.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!status) return res.status(404).json({ error: 'Status not found' });
    await status.destroy();
    res.json({ message: 'Status deleted' });
  } catch (err) { next(err); }
}

module.exports = { getStatuses, createStatus, viewStatus, deleteStatus };
