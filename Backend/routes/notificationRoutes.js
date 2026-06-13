import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

router.get('/my', userAuth, notificationController.getUserNotifications)
router.post('/create', userAuth, notificationController.createNotification)
router.patch('/read-all', userAuth, notificationController.markAllRead)
router.patch('/:id/read', userAuth, notificationController.markNotificationRead)

export default router;
