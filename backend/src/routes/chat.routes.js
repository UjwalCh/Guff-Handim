const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { getMyChats, createOrGetDirectChat, getChatById, getChatMessages, updateChatSettings } = require('../controllers/chat.controller');
const { sendMessage } = require('../controllers/message.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', getMyChats);
router.post('/', [body('targetUserId').isUUID()], validate, createOrGetDirectChat);
router.get('/:id', getChatById);
router.get('/:id/messages', getChatMessages);
router.post('/:id/messages',
  [body('type').isIn(['text', 'image', 'video', 'audio', 'file'])],
  validate,
  sendMessage
);
router.patch('/:id/settings', [body('disappearingTimer').isInt({ min: 0 })], validate, updateChatSettings);

module.exports = router;
