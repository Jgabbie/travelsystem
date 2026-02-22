const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const userAuth = require("../middleware/userAuth");

router.get("/getAdmins", userAuth, adminController.getAdmins);
router.put("/editUser/:id", userAuth, adminController.editUser);

module.exports = router;
