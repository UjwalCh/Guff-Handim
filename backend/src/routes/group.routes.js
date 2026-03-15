const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const {
  createGroup, updateGroup, addMembers, removeMember, updateMemberRole, generateInvite, joinByInvite,
} = require('../controllers/group.controller');

const router = express.Router();
router.use(authenticate);

router.post('/', upload.single('avatar'), [body('name').notEmpty().isLength({ max: 100 })], validate, createGroup);
router.put('/:id', upload.single('avatar'), updateGroup);
router.post('/:id/members', [body('memberIds').isArray({ min: 1 })], validate, addMembers);
router.delete('/:id/members/:userId', removeMember);
router.put('/:id/members/:userId/role', [body('role').isIn(['admin', 'member'])], validate, updateMemberRole);
router.post('/:id/invite', generateInvite);
router.post('/join/:code', joinByInvite);

module.exports = router;
