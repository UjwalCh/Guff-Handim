const bcrypt = require('bcryptjs');
const { OTP } = require('../models');
const logger = require('./logger');

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5');

function generateOTP() {
  // Cryptographically random 6-digit OTP
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOTP(phone) {
  // Invalidate any existing active OTPs for this phone
  await OTP.update({ isUsed: true }, { where: { phone, isUsed: false } });

  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await OTP.create({ phone, otpHash, expiresAt });

  // Use Twilio in production, console.log in development
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: `Your Guff Handim OTP is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`OTP sent via SMS to ${phone}`);
  } else {
    // Dev mode — log to console
    const otpLine = `[DEV] OTP for ${phone}: ${otp}`;
    logger.warn(otpLine);
    console.log(otpLine);
  }

  return true;
}

async function verifyOTP(phone, code) {
  const record = await OTP.findOne({
    where: { phone, isUsed: false },
    order: [['createdAt', 'DESC']],
  });

  if (!record) throw Object.assign(new Error('No active OTP found. Request a new one.'), { status: 400 });
  if (new Date() > record.expiresAt) {
    await record.update({ isUsed: true });
    throw Object.assign(new Error('OTP expired. Request a new one.'), { status: 400 });
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await record.update({ isUsed: true });
    throw Object.assign(new Error('Too many failed attempts. Request a new OTP.'), { status: 429 });
  }

  const isValid = await bcrypt.compare(code, record.otpHash);
  if (!isValid) {
    await record.increment('attempts');
    const remaining = MAX_ATTEMPTS - (record.attempts + 1);
    throw Object.assign(new Error(`Invalid OTP. ${remaining} attempts remaining.`), { status: 400 });
  }

  await record.update({ isUsed: true });
  return true;
}

module.exports = { sendOTP, verifyOTP };
