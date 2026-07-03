import express from 'express';
import * as uploadController from '../controllers/uploadController.js';
import { upload } from '../middleware/uploadFile.js';

const router = express.Router();

router.post('/upload-receipt', upload.single('file'), uploadController.uploadReceiptProof);
router.post('/upload-booking-documents', upload.array('files', 20), uploadController.uploadBookingDocuments);
router.post('/upload-package-images', upload.array('files', 3), uploadController.uploadPackageImage);
router.post('/upload-package-video', upload.single('file'), uploadController.uploadPackageVideo);
router.post('/upload-profile-picture', upload.single('file'), uploadController.uploadProfilePicture);
router.post('/upload-passport-requirements', upload.array('files', 10), uploadController.uploadPassportRequirements);
router.post('/upload-visa-requirements', upload.array('files', 20), uploadController.uploadVisaRequirements);
router.post('/upload-cancel-proof', upload.single('file'), uploadController.uploadCancellationProof);
router.get('/quotation/signed-url', uploadController.viewQuotationPdf);
router.get('/private-file', uploadController.viewQuotationPdf);
router.post('/upload-service-image', upload.single('file'), uploadController.uploadServiceImage);

export default router;