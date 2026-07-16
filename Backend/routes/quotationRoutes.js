import express from 'express'
import * as quotationsController from '../controllers/quotationsController.js'
import userAuth from '../middleware/userAuth.js'
import authorizeRoles from '../middleware/authorizeRoles.js';
import { upload } from '../middleware/uploadFile.js'

const router = express.Router()

const staffOnly = authorizeRoles('Admin', 'Employee');

router.post(
    '/create-quotation',
    userAuth,
    quotationsController.createQuotation
);

router.get(
    '/my-quotations',
    userAuth,
    quotationsController.getUserQuotations
);

router.get(
    '/get-quotation/:id',
    userAuth,
    quotationsController.getQuotation
);

router.post(
    '/:id/request-revision',
    userAuth,
    quotationsController.requestRevision
);

router.get(
    '/all-quotations',
    userAuth,
    staffOnly,
    quotationsController.getAllQuotations
);

router.get(
    '/archived-quotations',
    userAuth,
    staffOnly,
    quotationsController.getArchivedQuotations
);

router.post(
    '/archived-quotations/:id/restore',
    userAuth,
    staffOnly,
    quotationsController.restoreArchivedQuotation
);

router.put(
    '/:id',
    userAuth,
    staffOnly,
    quotationsController.updateQuotation
);

router.delete(
    '/:id',
    userAuth,
    staffOnly,
    quotationsController.deleteQuotation
);

router.post(
    '/:id/upload-pdf',
    userAuth,
    staffOnly,
    upload.single('pdf'),
    quotationsController.uploadQuotationPDF
);

router.put(
    '/:id/upload-travel-details',
    userAuth,
    staffOnly,
    quotationsController.uploadTravelDetails
);

export default router;