const express = require('express');
const { getPublicConfig } = require('../controllers/public.controller');

const router = express.Router();
router.get('/config', getPublicConfig);

module.exports = router;
