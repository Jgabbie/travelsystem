import express from "express";
import {
    getLocations,
    createLocation,
    updateLocation,
    deleteLocation
} from "../controllers/dfaLocationController.js";

import authorizeRoles from "../middleware/authorizeRoles.js";
import userAuth from "../middleware/userAuth.js";

router.use(userAuth);
const staffOnly = authorizeRoles('Admin', 'Employee');

const router = express.Router();

router.get("/get-dfalocation", getLocations);
router.post("/create-dfalocation", staffOnly, createLocation);
router.put("/:id/update-dfalocation", staffOnly, updateLocation);
router.delete("/:id/delete-dfalocation", staffOnly, deleteLocation);

export default router;