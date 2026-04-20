const express = require('express');
const router = express.Router();
const passportController = require('../controllers/passportController');
const userAuth = require('../middleware/userAuth');

router.post('/apply', userAuth, passportController.applyPassport);
router.get('/applications', userAuth, passportController.getPassportApplications);
router.get('/archived-applications', userAuth, passportController.getArchivedPassportApplications);
router.post('/archived-applications/:id/restore', userAuth, passportController.restoreArchivedPassportApplication);
router.get('/user-applications', userAuth, passportController.getUserPassportApplications);
router.get('/applications/:id', userAuth, passportController.getPassportApplicationById);
router.delete('/applications/:id/archive', userAuth, passportController.archivePassportApplication);
router.put('/applications/:id/status', userAuth, passportController.updatePassportStatus);
router.put('/applications/:id/documents', userAuth, passportController.updatePassportApplicationWithDocs);
router.put('/applications/:id/suggest-appointments', userAuth, passportController.suggestAppointmentSchedules);
router.put('/applications/:id/choose-appointment', userAuth, passportController.chosenSuggestedSchedule);
router.put('/applications/:id/release-option', userAuth, passportController.passportReleaseOptionUpdate);
router.put('/applications/:id/resubmit-documents', userAuth, passportController.requestPassportDocumentResubmission);
router.post('/verify-payment', userAuth, passportController.verifyTokenCheckout);

module.exports = router;