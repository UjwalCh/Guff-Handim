const express = require('express');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { getStatuses, createStatus, viewStatus, deleteStatus } = require('../controllers/status.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', getStatuses);
router.post('/', upload.single('media'), createStatus);
router.post('/:id/view', viewStatus);
router.delete('/:id', deleteStatus);

module.exports = router;
