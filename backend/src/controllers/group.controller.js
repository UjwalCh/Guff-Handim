const { v4: uuidv4 } = require('uuid');
const { Chat, ChatMember, User } = require('../models');
const { getIO } = require('../socket');

async function createGroup(req, res, next) {
  try {
    const { name, description, memberIds, encryptedGroupKeys } = req.body;
    // encryptedGroupKeys: { [userId]: { nonce, ciphertext } } — group key encrypted for each member

    if (!name) return res.status(400).json({ error: 'Group name is required' });
    const allMemberIds = [...new Set([req.user.id, ...memberIds])];

    const chat = await Chat.create({
      isGroup: true,
      name: name.trim().slice(0, 100),
      description: description?.slice(0, 500),
      createdBy: req.user.id,
      inviteCode: uuidv4().replace(/-/g, '').slice(0, 12),
    });

    if (req.file) {
      await chat.update({ avatar: `/uploads/images/${req.file.filename}` });
    }

    // Create membership rows with encrypted group key for each member
    await ChatMember.bulkCreate(allMemberIds.map(uid => ({
      chatId: chat.id,
      userId: uid,
      role: uid === req.user.id ? 'admin' : 'member',
      encryptedGroupKey: encryptedGroupKeys?.[uid]
        ? JSON.stringify(encryptedGroupKeys[uid])
        : null,
    })));

    const fullChat = await Chat.findByPk(chat.id, {
      include: [{ model: User, as: 'members', attributes: ['id', 'name', 'avatar', 'publicKey'] }],
    });

    // Notify all members
    const io = getIO();
    allMemberIds.forEach(uid => {
      io.to(`user:${uid}`).emit('added-to-group', { chat: fullChat });
    });

    res.status(201).json({ chat: fullChat });
  } catch (err) { next(err); }
}

async function updateGroup(req, res, next) {
  try {
    const { name, description } = req.body;
    const membership = await ChatMember.findOne({
      where: { chatId: req.params.id, userId: req.user.id, role: 'admin', isActive: true },
    });
    if (!membership) return res.status(403).json({ error: 'Admin only' });

    const updates = {};
    if (name) updates.name = name.trim().slice(0, 100);
    if (description !== undefined) updates.description = description.slice(0, 500);
    if (req.file) updates.avatar = `/uploads/images/${req.file.filename}`;

    await Chat.update(updates, { where: { id: req.params.id } });

    const io = getIO();
    io.to(`chat:${req.params.id}`).emit('group-updated', { chatId: req.params.id, updates });

    res.json({ message: 'Group updated' });
  } catch (err) { next(err); }
}

async function addMembers(req, res, next) {
  try {
    const { memberIds, encryptedGroupKeys } = req.body;
    const chatId = req.params.id;

    const requester = await ChatMember.findOne({
      where: { chatId, userId: req.user.id, role: 'admin', isActive: true },
    });
    if (!requester) return res.status(403).json({ error: 'Admin only' });

    await ChatMember.bulkCreate(
      memberIds.map(uid => ({
        chatId,
        userId: uid,
        role: 'member',
        encryptedGroupKey: encryptedGroupKeys?.[uid] ? JSON.stringify(encryptedGroupKeys[uid]) : null,
      })),
      { ignoreDuplicates: true }
    );

    // Re-activate if previously removed
    await ChatMember.update({ isActive: true }, { where: { chatId, userId: memberIds } });

    const newMembers = await User.findAll({
      where: { id: memberIds },
      attributes: ['id', 'name', 'avatar', 'publicKey'],
    });

    const io = getIO();
    io.to(`chat:${chatId}`).emit('members-added', { chatId, members: newMembers });
    newMembers.forEach(m => io.to(`user:${m.id}`).emit('added-to-group', { chatId }));

    res.json({ members: newMembers });
  } catch (err) { next(err); }
}

async function removeMember(req, res, next) {
  try {
    const { id: chatId, userId: targetId } = req.params;

    const requester = await ChatMember.findOne({
      where: { chatId, userId: req.user.id, role: 'admin', isActive: true },
    });
    // Allow self-removal (leave)
    if (!requester && targetId !== req.user.id) return res.status(403).json({ error: 'Admin only' });

    await ChatMember.update({ isActive: false }, { where: { chatId, userId: targetId } });

    const io = getIO();
    io.to(`chat:${chatId}`).emit('member-removed', { chatId, userId: targetId });
    io.to(`user:${targetId}`).emit('removed-from-group', { chatId });

    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
}

async function updateMemberRole(req, res, next) {
  try {
    const { id: chatId, userId: targetId } = req.params;
    const { role } = req.body;

    const requester = await ChatMember.findOne({
      where: { chatId, userId: req.user.id, role: 'admin', isActive: true },
    });
    if (!requester) return res.status(403).json({ error: 'Admin only' });

    await ChatMember.update({ role }, { where: { chatId, userId: targetId } });
    res.json({ message: 'Role updated' });
  } catch (err) { next(err); }
}

async function generateInvite(req, res, next) {
  try {
    const chatId = req.params.id;
    const membership = await ChatMember.findOne({ where: { chatId, userId: req.user.id, isActive: true } });
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const code = uuidv4().replace(/-/g, '').slice(0, 12);
    await Chat.update({ inviteCode: code }, { where: { id: chatId } });
    res.json({ inviteLink: `${process.env.FRONTEND_URL}/join/${code}` });
  } catch (err) { next(err); }
}

async function joinByInvite(req, res, next) {
  try {
    const chat = await Chat.findOne({ where: { inviteCode: req.params.code, isGroup: true } });
    if (!chat) return res.status(404).json({ error: 'Invalid invite link' });

    await ChatMember.upsert({ chatId: chat.id, userId: req.user.id, role: 'member', isActive: true });

    const io = getIO();
    io.to(`chat:${chat.id}`).emit('members-added', { chatId: chat.id, members: [req.user] });

    res.json({ chat });
  } catch (err) { next(err); }
}

module.exports = { createGroup, updateGroup, addMembers, removeMember, updateMemberRole, generateInvite, joinByInvite };
