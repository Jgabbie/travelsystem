const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const userAuth = require("../middleware/userAuth");

router.post("/create-checkout-session", userAuth, paymentController.createCheckoutSession);
router.post("/create-checkout-session-passport", userAuth, paymentController.createCheckoutSessionPassport);
router.post("/create-checkout-session-visa", userAuth, paymentController.createCheckoutSessionVisa);
router.post("/create-checkout-session-deposit", userAuth, paymentController.createCheckoutSessionDeposit);
router.post("/create-checkout-token", userAuth, paymentController.createCheckoutToken);
router.post("/manual", userAuth, paymentController.createManualPayment);
router.post("/manual-deposit", userAuth, paymentController.createManualPaymentDeposit);
router.post("/manual-visa", userAuth, paymentController.createManualPaymentVisa);
router.post("/manual-passport", userAuth, paymentController.createManualPaymentPassport);
router.post('/webhook/paymongo', express.raw({ type: 'application/json' }), paymentController.handlePayMongoWebhook);
module.exports = router;