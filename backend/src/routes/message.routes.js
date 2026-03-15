const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { editMessage, deleteMessage, addReaction, removeReaction, starMessage, unstarMessage, listStarredMessages, markRead } = require('../controllers/message.controller');

const router = express.Router();
router.use(authenticate);

router.patch('/:id', [body('encryptedContent').notEmpty()], validate, editMessage);
router.delete('/:id', deleteMessage);
router.post('/:id/reactions', [body('emoji').notEmpty().isLength({ max: 10 })], validate, addReaction);
router.delete('/:id/reactions', removeReaction);
router.get('/starred', listStarredMessages);
router.post('/:id/star', starMessage);
router.delete('/:id/star', unstarMessage);
router.patch('/read', [body('chatId').isUUID(), body('messageIds').isArray()], validate, markRead);

module.exports = router;
