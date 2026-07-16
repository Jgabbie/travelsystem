import express from 'express';
import * as logController from '../controllers/logController.js';
import userAuth from '../middleware/userAuth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

router.use(userAuth);
router.use(authorizeRoles('Admin'));

router.get('/get-logs', logController.getLogs);
router.get('/get-audits', logController.getAudits);

export default router;