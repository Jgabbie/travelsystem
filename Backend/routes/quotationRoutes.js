const express = require('express')
const router = express.Router()
const quotationsController = require('../controllers/quotationsController')
const userAuth = require('../middleware/userAuth')
const { upload } = require('../middleware/uploadFile')

router.post('/create-quotation', userAuth, quotationsController.createQuotation)
router.get('/my-quotations', userAuth, quotationsController.getUserQuotations)
router.get('/all-quotations', userAuth, quotationsController.getAllQuotations)
router.put('/:id', userAuth, quotationsController.updateQuotation)
router.delete('/:id', userAuth, quotationsController.deleteQuotation)
router.get('/get-quotation/:id', userAuth, quotationsController.getQuotation)
router.post('/:id/upload-pdf', userAuth, upload.single('pdf'), quotationsController.uploadQuotationPDF)
router.post('/:id/request-revision', userAuth, quotationsController.requestRevision)
router.put('/:id/upload-travel-details', userAuth, quotationsController.uploadTravelDetails)

module.exports = router