import express from 'express'
import * as quotationsController from '../controllers/quotationsController.js'
import userAuth from '../middleware/userAuth.js'
import { upload } from '../middleware/uploadFile.js'

const router = express.Router()

router.post('/create-quotation', userAuth, quotationsController.createQuotation)
router.get('/my-quotations', userAuth, quotationsController.getUserQuotations)
router.get('/all-quotations', userAuth, quotationsController.getAllQuotations)
router.get('/archived-quotations', userAuth, quotationsController.getArchivedQuotations)
router.post('/archived-quotations/:id/restore', userAuth, quotationsController.restoreArchivedQuotation)
router.put('/:id', userAuth, quotationsController.updateQuotation)
router.delete('/:id', userAuth, quotationsController.deleteQuotation)
router.get('/get-quotation/:id', userAuth, quotationsController.getQuotation)
router.post('/:id/upload-pdf', userAuth, upload.single('pdf'), quotationsController.uploadQuotationPDF)
router.post('/:id/request-revision', userAuth, quotationsController.requestRevision)
router.put('/:id/upload-travel-details', userAuth, quotationsController.uploadTravelDetails)

export default router;