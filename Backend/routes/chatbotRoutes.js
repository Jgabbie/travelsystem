const express = require('express');
const multer = require('multer');

const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/chat', chatbotController.chatAction);
router.post('/knowledge/upload', upload.single('file'), chatbotController.uploadKnowledge);
router.get('/knowledge/status', chatbotController.knowledgeStatus);

module.exports = router;