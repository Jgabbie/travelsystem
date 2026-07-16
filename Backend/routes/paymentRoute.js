import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

router.post(
    '/webhook/paymongo',
    express.raw({ type: 'application/json' }),
    paymentController.handlePayMongoWebhook
);

router.use(userAuth);

router.post(
    '/create-checkout-session',
    paymentController.createCheckoutSession
);

router.post(
    '/create-checkout-session-quotation',
    paymentController.createCheckoutSessionQuotation
);

router.post(
    '/create-checkout-session-passport',
    paymentController.createCheckoutSessionPassport
);

router.post(
    '/create-checkout-session-visa',
    paymentController.createCheckoutSessionVisa
);

router.post(
    '/create-checkout-session-visa-penalty',
    paymentController.createCheckoutSessionVisaPenalty
);

router.post(
    '/create-checkout-session-passport-penalty',
    paymentController.createCheckoutSessionPassportPenalty
);

router.post(
    '/create-checkout-session-deposit',
    paymentController.createCheckoutSessionDeposit
);

router.post(
    '/create-checkout-session-delivery-fee',
    paymentController.createCheckoutSessionDeliveryFee
);

router.post(
    '/create-checkout-token',
    paymentController.createCheckoutToken
);


/* Manual payments */

router.post(
    '/manual',
    paymentController.createManualPayment
);

router.post(
    '/manual-quotation',
    paymentController.createManualPaymentQuotation
);

router.post(
    '/manual-deposit',
    paymentController.createManualPaymentDeposit
);

router.post(
    '/manual-visa',
    paymentController.createManualPaymentVisa
);

router.post(
    '/manual-passport',
    paymentController.createManualPaymentPassport
);

router.post(
    '/manual-visa-penalty',
    paymentController.createManualPaymentVisaPenalty
);

router.post(
    '/manual-passport-penalty',
    paymentController.createManualPaymentPassportPenalty
);

router.post(
    '/manual-delivery-fee',
    paymentController.createManualPaymentDeliveryFee
);

export default router;