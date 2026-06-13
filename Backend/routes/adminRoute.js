import express from 'express';
import * as adminController from '../controllers/adminController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

router.get("/getAdmins", userAuth, adminController.getAdmins);
router.put("/editUser/:id", userAuth, adminController.editUser);
router.get("/dashboard-stats", userAuth, adminController.getDashboardStats);

export default router;
