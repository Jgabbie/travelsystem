import express from "express";
import {
    createPackageTags,
    getPackageTags,
} from "../controllers/packageTagController.js";

const router = express.Router();

router.get("/", getPackageTags);
router.post("/", createPackageTags);

export default router;