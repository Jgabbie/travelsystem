const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const userAuth = require("../middleware/userAuth");

router.post("/create-checkout-session", paymentController.createCheckoutSession);
router.post("/create-checkout-token", userAuth, paymentController.createCheckoutToken);
module.exports = router;