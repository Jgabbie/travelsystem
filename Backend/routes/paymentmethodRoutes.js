import express from "express";
import multer from "multer";
import {
    createMethod,
    getMethods,
    updateMethod,
    deleteMethod,
} from "../controllers/paymentmethodController.js";

import { upload } from "../middleware/uploadFile.js";

import authorizeRoles from "../middleware/authorizeRoles.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();
router.use(userAuth);

const staffOnly = authorizeRoles('Admin', 'Employee');


router.get("/get-methods", getMethods);

router.post(
    "/create-methods",
    upload.single("image"),
    staffOnly,
    createMethod
);

router.put(
    "/:id/update-methods",
    upload.single("image"),
    staffOnly,
    updateMethod
);

router.delete("/:id/delete-methods", staffOnly, deleteMethod);

export default router;