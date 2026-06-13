import express from 'express';
import * as recommendController from '../controllers/recommendController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

// Personalized recommendations for currently authenticated user
router.get('/', userAuth, recommendController.getRecommendations);

// Manual training trigger (can be restricted later)
router.post('/train', recommendController.trainModels);

// Health status of AI service
router.get('/health', recommendController.checkHealth);

export default router;
