import express from "express";

import {
    createRecentTour,
    getRecentTours,
    deleteRecentTour,
} from "../controllers/recentToursController.js";

import { upload } from "../middleware/uploadFile.js";

import authorizeRoles from "../middleware/authorizeRoles.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.get(
    "/get-recent-tours",
    getRecentTours
);

router.use(userAuth);

const staffOnly = authorizeRoles("Admin", "Employee");



router.post(
    "/create-recent-tour",
    upload.single("image"),
    staffOnly,
    createRecentTour
);

router.delete(
    "/:id/delete-recent-tour",
    staffOnly,
    deleteRecentTour
);

export default router;