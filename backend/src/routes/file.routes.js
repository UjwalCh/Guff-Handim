const express = require('express');
const { authenticate } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimit');
const { upload } = require('../middleware/upload');
const { uploadFile, uploadAvatar } = require('../controllers/file.controller');

const router = express.Router();
router.use(authenticate);

router.post('/upload', uploadLimiter, upload.single('file'), uploadFile);
router.post('/avatar', uploadLimiter, upload.single('avatar'), uploadAvatar);

module.exports = router;
