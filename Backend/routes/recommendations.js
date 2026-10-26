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

router.post(
    '/train',
    userAuth,
    staffOnly,
    recommendController.trainModels
);

router.get(
    '/health',
    recommendController.checkHealth
);
export default router;
