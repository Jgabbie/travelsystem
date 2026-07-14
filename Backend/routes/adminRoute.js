import express from 'express';
import * as adminController from '../controllers/adminController.js';
import userAuth from '../middleware/userAuth.js';
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = express.Router();

router.get(
    "/getAdmins",
    userAuth,
    authorizeRoles("Admin"),
    adminController.getAdmins
);

router.put(
    "/editUser/:id",
    userAuth,
    authorizeRoles("Admin"),
    adminController.editUser
);

router.get(
    "/dashboard-stats",
    userAuth,
    authorizeRoles("Admin", "Employee"),
    adminController.getDashboardStats
);
export default router;
