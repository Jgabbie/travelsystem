import express from "express";

import {
    getFAQs,
    createFAQ,
    updateFAQ,
    deleteFAQ
} from "../controllers/faqsController.js";

import userAuth from "../middleware/userAuth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = express.Router();

router.get("/get-faqs", getFAQs);

router.use(userAuth);

const staffOnly = authorizeRoles("Admin", "Employee");



router.post(
    "/create-faq",
    staffOnly,
    createFAQ
);

router.put(
    "/:id/update-faq",
    staffOnly,
    updateFAQ
);

router.delete(
    "/:id/delete-faq",
    staffOnly,
    deleteFAQ
);

export default router;