const express = require('express');
const router = express.Router();
const recommendController = require('../controllers/recommendController');
const userAuth = require('../middleware/userAuth');

// Personalized recommendations for currently authenticated user
router.get('/', userAuth, recommendController.getRecommendations);

// Manual training trigger (can be restricted later)
router.post('/train', recommendController.trainModels);

// Health status of AI service
router.get('/health', recommendController.checkHealth);

module.exports = router;
