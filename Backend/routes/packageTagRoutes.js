import express from "express";
import {
    createPackageTags,
    getPackageTags,
} from "../controllers/packageTagController.js";

import userAuth from "../middleware/userAuth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = express.Router();

const staffOnly = authorizeRoles("Admin", "Employee");

router.get(
    "/",
    getPackageTags
);

router.post(
    "/",
    userAuth,
    staffOnly,
    createPackageTags
);

export default router;