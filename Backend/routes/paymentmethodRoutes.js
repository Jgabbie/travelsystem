import express from "express";
import multer from "multer";
import {
    createMethod,
    getMethods,
    updateMethod,
    deleteMethod,
} from "../controllers/paymentmethodController.js";

import { upload } from "../middleware/uploadFile.js";


const router = express.Router();



router.get("/get-methods", getMethods);

router.post(
    "/create-methods",
    upload.single("image"),
    createMethod
);

router.put(
    "/:id/update-methods",
    upload.single("image"),
    updateMethod
);

router.delete("/:id/delete-methods", deleteMethod);

export default router;