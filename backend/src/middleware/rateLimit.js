const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
  });

// Strict limiter for OTP sending (prevents SMS abuse)
const otpSendLimiter = createLimiter(
  10 * 60 * 1000,   // 10 minutes
  3,
  'Too many OTP requests, please wait 10 minutes.'
);

// OTP verification limiter (5 tries per 15 min — model also enforces this)
const otpVerifyLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many verification attempts, please wait.'
);

// General API limiter
const apiLimiter = createLimiter(
  60 * 1000,       // 1 minute
  120,
  'Too many requests, slow down.'
);

// File upload limiter
const uploadLimiter = createLimiter(
  60 * 1000,
  30,
  'Too many uploads, please wait.'
);

module.exports = { otpSendLimiter, otpVerifyLimiter, apiLimiter, uploadLimiter };
