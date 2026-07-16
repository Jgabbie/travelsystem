import express from 'express'
import * as visaController from '../controllers/visaController.js'
import userAuth from '../middleware/userAuth.js'
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router()

const staffOnly = authorizeRoles('Admin', 'Employee');


router.post(
    '/apply',
    userAuth,
    visaController.applyVisa
);

router.get(
    '/user-applications',
    userAuth,
    visaController.getUserVisaApplications
);

router.get(
    '/applications/:id',
    userAuth,
    visaController.getVisaApplicationById
);

router.put(
    '/applications/:id/documents',
    userAuth,
    visaController.updateVisaApplicationWithDocs
);

router.put(
    '/applications/:id/choose-appointment',
    userAuth,
    visaController.chooseAppointment
);

router.put(
    '/applications/:id/release-option',
    userAuth,
    visaController.passportReleaseOptionUpdate
);

router.post(
    '/verify-payment',
    userAuth,
    visaController.verifyTokenCheckout
);

router.get(
    '/applications',
    userAuth,
    staffOnly,
    visaController.getVisaApplications
);

router.get(
    '/archived-applications',
    userAuth,
    staffOnly,
    visaController.getArchivedVisaApplications
);

router.post(
    '/archived-applications/:id/restore',
    userAuth,
    staffOnly,
    visaController.restoreArchivedVisaApplication
);

router.delete(
    '/applications/:id/archive',
    userAuth,
    staffOnly,
    visaController.archiveVisaApplication
);

router.put(
    '/applications/:id/status',
    userAuth,
    staffOnly,
    visaController.updateVisaApplicationStatus
);

router.put(
    '/applications/:id/suggest-appointments',
    userAuth,
    staffOnly,
    visaController.suggestAppointmentSchedules
);

router.put(
    '/applications/:id/delivery-details',
    userAuth,
    staffOnly,
    visaController.updateVisaDeliveryDetails
);

router.put(
    '/applications/:id/resubmit-documents',
    userAuth,
    staffOnly,
    visaController.requestVisaDocumentResubmission
);

export default router;
