import express from 'express';
import * as recommendController from '../controllers/recommendController.js';
import userAuth from '../middleware/userAuth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

const staffOnly = authorizeRoles('Admin', 'Employee');

router.get(
    '/',
    userAuth,
    recommendController.getRecommendations
);

// Manually retrain the recommendation models
router.post(
    '/train',
    userAuth,
    staffOnly,
    recommendController.trainModels
);

// Basic AI recommendation-service health check
router.get(
    '/health',
    recommendController.checkHealth
);
export default router;
