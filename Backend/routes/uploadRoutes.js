import express from 'express';
import * as uploadController from '../controllers/uploadController.js';
import { upload } from '../middleware/uploadFile.js';
import userAuth from '../middleware/userAuth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';


const router = express.Router();

const staffOnly = authorizeRoles('Admin', 'Employee');

router.post(
    '/upload-receipt',
    userAuth,
    upload.single('file'),
    uploadController.uploadReceiptProof
);

router.post(
    '/upload-booking-documents',
    userAuth,
    upload.array('files', 40),
    uploadController.uploadBookingDocuments
);

router.post(
    '/upload-profile-picture',
    userAuth,
    upload.single('file'),
    uploadController.uploadProfilePicture
);

router.post(
    '/upload-passport-requirements',
    userAuth,
    upload.array('files', 10),
    uploadController.uploadPassportRequirements
);

router.post(
    '/upload-visa-requirements',
    userAuth,
    upload.array('files', 20),
    uploadController.uploadVisaRequirements
);

router.post(
    '/upload-cancel-proof',
    userAuth,
    upload.single('file'),
    uploadController.uploadCancellationProof
);


router.get(
    '/quotation/signed-url',
    userAuth,
    uploadController.viewQuotationPdf
);

router.get(
    '/private-file',
    userAuth,
    uploadController.viewQuotationPdf
);

router.post(
    '/upload-package-images',
    userAuth,
    staffOnly,
    upload.array('files', 3),
    uploadController.uploadPackageImage
);

router.post(
    '/upload-package-video',
    userAuth,
    staffOnly,
    upload.single('file'),
    uploadController.uploadPackageVideo
);

router.post(
    '/upload-service-image',
    userAuth,
    staffOnly,
    upload.single('file'),
    uploadController.uploadServiceImage
);


export default router;