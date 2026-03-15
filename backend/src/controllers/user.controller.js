const { Op } = require('sequelize');
const { User, Block, Chat, ChatMember, PushToken } = require('../models');
const { sanitizeUser, paginate } = require('../utils/helpers');

async function getMe(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    res.json({ user: sanitizeUser(user) });
  } catch (err) { next(err); }
}

async function updateMe(req, res, next) {
  try {
    const { name, bio, publicKey } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim().slice(0, 100);
    if (bio !== undefined) updates.bio = bio.slice(0, 500);
    if (publicKey) updates.publicKey = publicKey;
    if (req.file) updates.avatar = `/uploads/images/${req.file.filename}`;

    const user = await User.findByPk(req.user.id);
    await user.update(updates);
    res.json({ user: sanitizeUser(user) });
  } catch (err) { next(err); }
}

async function searchUsers(req, res, next) {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) return res.json({ users: [] });

    const q = `%${query}%`;
    const blockedIds = (await Block.findAll({
      where: { blockerId: req.user.id },
      attributes: ['blockedId'],
    })).map(b => b.blockedId);

    const users = await User.findAll({
      where: {
        id: { [Op.ne]: req.user.id, [Op.notIn]: blockedIds },
        isVerified: true,
        isActive: true,
        [Op.or]: [
          { name: { [Op.like]: q } },
          { phone: { [Op.like]: q } },
        ],
      },
      attributes: ['id', 'name', 'phone', 'avatar', 'bio', 'isOnline', 'lastSeen', 'publicKey'],
      limit: 20,
    });

    res.json({ users });
  } catch (err) { next(err); }
}

async function getUserById(req, res, next) {
  try {
    const user = await User.findOne({
      where: { id: req.params.id, isActive: true },
      attributes: ['id', 'name', 'phone', 'avatar', 'bio', 'isOnline', 'lastSeen', 'publicKey'],
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
}

async function blockUser(req, res, next) {
  try {
    const blockedId = req.params.userId;
    if (blockedId === req.user.id) return res.status(400).json({ error: 'Cannot block yourself' });

    await Block.findOrCreate({ where: { blockerId: req.user.id, blockedId } });
    res.json({ message: 'User blocked' });
  } catch (err) { next(err); }
}

async function unblockUser(req, res, next) {
  try {
    await Block.destroy({ where: { blockerId: req.user.id, blockedId: req.params.userId } });
    res.json({ message: 'User unblocked' });
  } catch (err) { next(err); }
}

async function getBlockedUsers(req, res, next) {
  try {
    const blocks = await Block.findAll({
      where: { blockerId: req.user.id },
      include: [{ model: User, as: 'blocked', attributes: ['id', 'name', 'avatar'] }],
    });
    res.json({ blocked: blocks.map(b => b.blocked) });
  } catch (err) { next(err); }
}

async function updatePushToken(req, res, next) {
  try {
    const { token, platform } = req.body;
    await PushToken.upsert({ userId: req.user.id, token, platform, isActive: true });
    res.json({ message: 'Push token registered' });
  } catch (err) { next(err); }
}

module.exports = { getMe, updateMe, searchUsers, getUserById, blockUser, unblockUser, getBlockedUsers, updatePushToken };
