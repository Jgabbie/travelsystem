const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { upload } = require('../middleware/uploadFile');

router.post(
    '/upload-receipt',
    upload.single('file'),
    uploadController.uploadReceiptProof
);

module.exports = router;