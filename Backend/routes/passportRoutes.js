import express from 'express';
import * as passportController from '../controllers/passportController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

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
router.put('/applications/:id/choose-appointment', userAuth, passportController.chooseAppointment);
router.put('/applications/:id/release-option', userAuth, passportController.passportReleaseOptionUpdate);
router.put('/applications/:id/resubmit-documents', userAuth, passportController.requestPassportDocumentResubmission);
router.post('/verify-payment', userAuth, passportController.verifyTokenCheckout);

export default router;