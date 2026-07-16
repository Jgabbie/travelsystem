import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import userAuth from '../middleware/userAuth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

const staffOnly = authorizeRoles('Admin', 'Employee');

// All notification routes require authentication
router.use(userAuth);

router.get(
    '/my',
    notificationController.getUserNotifications
);

router.patch(
    '/read-all',
    notificationController.markAllRead
);

router.patch(
    '/:id/read',
    notificationController.markNotificationRead
);

router.post(
    '/create',
    staffOnly,
    notificationController.createNotification
);

export default router;