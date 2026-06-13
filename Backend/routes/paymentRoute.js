import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

router.post("/create-checkout-session", userAuth, paymentController.createCheckoutSession);
router.post("/create-checkout-session-quotation", userAuth, paymentController.createCheckoutSessionQuotation);
router.post("/create-checkout-session-passport", userAuth, paymentController.createCheckoutSessionPassport);
router.post("/create-checkout-session-visa", userAuth, paymentController.createCheckoutSessionVisa);
router.post("/create-checkout-session-visa-penalty", userAuth, paymentController.createCheckoutSessionVisaPenalty);
router.post("/create-checkout-session-passport-penalty", userAuth, paymentController.createCheckoutSessionPassportPenalty);
router.post("/create-checkout-session-deposit", userAuth, paymentController.createCheckoutSessionDeposit);
router.post("/create-checkout-session-delivery-fee", userAuth, paymentController.createCheckoutSessionDeliveryFee);
router.post("/create-checkout-token", userAuth, paymentController.createCheckoutToken);
router.post("/manual", userAuth, paymentController.createManualPayment);
router.post("/manual-quotation", userAuth, paymentController.createManualPaymentQuotation);
router.post("/manual-deposit", userAuth, paymentController.createManualPaymentDeposit);
router.post("/manual-visa", userAuth, paymentController.createManualPaymentVisa);
router.post("/manual-passport", userAuth, paymentController.createManualPaymentPassport);
router.post("/manual-visa-penalty", userAuth, paymentController.createManualPaymentVisaPenalty);
router.post("/manual-passport-penalty", userAuth, paymentController.createManualPaymentPassportPenalty);
router.post("/manual-delivery-fee", userAuth, paymentController.createManualPaymentDeliveryFee);
router.post('/webhook/paymongo', express.raw({ type: 'application/json' }), paymentController.handlePayMongoWebhook);
export default router;