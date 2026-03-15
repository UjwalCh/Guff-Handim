const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticateAdmin } = require('../middleware/adminAuth');
const {
  adminLogin,
  verifyAdminOTP,
  me,
  logout,
  listSessions,
  revokeSession,
} = require('../controllers/adminAuth.controller');

const router = express.Router();

router.post('/login', [
  body('username').isString().isLength({ min: 2, max: 80 }),
  body('password').isString().isLength({ min: 8, max: 120 }),
], validate, adminLogin);

router.post('/verify-otp', [
  body('username').isString().isLength({ min: 2, max: 80 }),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
], validate, verifyAdminOTP);

router.get('/me', authenticateAdmin, me);
router.post('/logout', authenticateAdmin, logout);
router.get('/sessions', authenticateAdmin, listSessions);
router.delete('/sessions/:id', authenticateAdmin, revokeSession);

module.exports = router;
