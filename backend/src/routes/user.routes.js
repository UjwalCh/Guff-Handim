const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const {
  getMe, updateMe, searchUsers, getUserById,
  blockUser, unblockUser, getBlockedUsers, updatePushToken,
} = require('../controllers/user.controller');

const router = express.Router();
router.use(authenticate);

router.get('/me', getMe);
router.put('/me', upload.single('avatar'), [body('name').optional().isLength({ max: 100 })], validate, updateMe);
router.get('/search', searchUsers);
router.get('/blocks', getBlockedUsers);
router.post('/block/:userId', blockUser);
router.delete('/block/:userId', unblockUser);
router.get('/:id', getUserById);
router.put('/push-token', [body('token').notEmpty(), body('platform').isIn(['web', 'ios', 'android'])], validate, updatePushToken);

module.exports = router;
