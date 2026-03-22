const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const userAuth = require("../middleware/userAuth");

router.post("/create-checkout-session", userAuth, paymentController.createCheckoutSession);
router.post("/create-checkout-token", userAuth, paymentController.createCheckoutToken);
router.post('/hitpay', userAuth, paymentController.hitpayPayment);
router.post('/webhook/hitpay', paymentController.handleHitPayWebhook);
router.post('/webhook/paymongo', express.raw({ type: 'application/json' }), paymentController.handlePayMongoWebhook);
module.exports = router;