import express from 'express';
import * as passportController from '../controllers/passportController.js';
import userAuth from '../middleware/userAuth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

const staffOnly = authorizeRoles('Admin', 'Employee');

router.post(
    '/apply',
    userAuth,
    passportController.applyPassport
);

router.get(
    '/user-applications',
    userAuth,
    passportController.getUserPassportApplications
);

router.get(
    '/applications/:id',
    userAuth,
    passportController.getPassportApplicationById
);

router.put(
    '/applications/:id/documents',
    userAuth,
    passportController.updatePassportApplicationWithDocs
);

router.put(
    '/applications/:id/choose-appointment',
    userAuth,
    passportController.chooseAppointment
);

router.put(
    '/applications/:id/release-option',
    userAuth,
    passportController.passportReleaseOptionUpdate
);

router.post(
    '/verify-payment',
    userAuth,
    passportController.verifyTokenCheckout
);

router.get(
    '/applications',
    userAuth,
    staffOnly,
    passportController.getPassportApplications
);

router.get(
    '/archived-applications',
    userAuth,
    staffOnly,
    passportController.getArchivedPassportApplications
);

router.post(
    '/archived-applications/:id/restore',
    userAuth,
    staffOnly,
    passportController.restoreArchivedPassportApplication
);

router.delete(
    '/applications/:id/archive',
    userAuth,
    staffOnly,
    passportController.archivePassportApplication
);

router.put(
    '/applications/:id/status',
    userAuth,
    staffOnly,
    passportController.updatePassportStatus
);

router.put(
    '/applications/:id/suggest-appointments',
    userAuth,
    staffOnly,
    passportController.suggestAppointmentSchedules
);

router.put(
    '/applications/:id/resubmit-documents',
    userAuth,
    staffOnly,
    passportController.requestPassportDocumentResubmission
);

export default router;