const express = require('express');
const router = express.Router();
const passportController = require('../controllers/passportController');
const userAuth = require('../middleware/userAuth');


router.post('/apply', userAuth, passportController.applyPassport);
router.get('/applications', userAuth, passportController.getPassportApplications);
router.get('/user-applications', userAuth, passportController.getUserPassportApplications);
router.get('/applications/:id', userAuth, passportController.getPassportApplicationById);
router.put('/applications/:id/status', userAuth, passportController.updatePassportStatus);
router.put('/applications/:id/documents', userAuth, passportController.updatePassportApplicationWithDocs);
router.post('/verify-payment', userAuth, passportController.verifyTokenCheckout);

module.exports = router;