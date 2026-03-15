const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { otpSendLimiter, otpVerifyLimiter } = require('../middleware/rateLimit');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const {
  sendOTPHandler,
  verifyOTPHandler,
  signUpHandler,
  loginWithPasswordHandler,
  requestPasswordResetHandler,
  resetPasswordHandler,
  setupProfileHandler,
  refreshTokenHandler,
  logoutHandler,
} = require('../controllers/auth.controller');

const router = express.Router();

router.post('/send-otp',
  otpSendLimiter,
  [body('phone').isMobilePhone().withMessage('Valid phone number required')],
  validate,
  sendOTPHandler
);

router.post('/verify-otp',
  otpVerifyLimiter,
  [
    body('phone').isMobilePhone(),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
  ],
  validate,
  verifyOTPHandler
);

router.post('/signup', [
  body('name').isLength({ min: 2, max: 100 }),
  body('email').optional({ values: 'falsy' }).isEmail(),
  body('phone').isMobilePhone(),
  body('password').isLength({ min: 8, max: 120 }),
], validate, signUpHandler);

router.post('/login', [
  body('identifier').isString().isLength({ min: 3, max: 160 }),
  body('password').isLength({ min: 8, max: 120 }),
], validate, loginWithPasswordHandler);

router.post('/forgot-password', [
  body('identifier').isString().isLength({ min: 3, max: 160 }),
], validate, requestPasswordResetHandler);

router.post('/reset-password', [
  body('identifier').isString().isLength({ min: 3, max: 160 }),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  body('newPassword').isLength({ min: 8, max: 120 }),
], validate, resetPasswordHandler);

router.put('/setup-profile',
  authenticate,
  upload.single('avatar'),
  [
    body('name').optional().isLength({ min: 1, max: 100 }),
    body('publicKey').optional().isString(),
  ],
  validate,
  setupProfileHandler
);

router.post('/refresh-token', refreshTokenHandler);

router.post('/logout', authenticate, logoutHandler);

module.exports = router;
