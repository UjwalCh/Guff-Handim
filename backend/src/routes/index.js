const express = require('express');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(apiLimiter);

router.use('/public', require('./public.routes'));
router.use('/auth',     require('./auth.routes'));
router.use('/admin-auth', require('./adminAuth.routes'));
router.use('/admin',      require('./admin.routes'));
router.use('/users',    require('./user.routes'));
router.use('/chats',    require('./chat.routes'));
router.use('/messages', require('./message.routes'));
router.use('/groups',   require('./group.routes'));
router.use('/statuses', require('./status.routes'));
router.use('/files',    require('./file.routes'));

module.exports = router;
