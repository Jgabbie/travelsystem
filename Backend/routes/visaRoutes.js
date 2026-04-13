const express = require('express')
const router = express.Router()
const visaController = require('../controllers/visaController')
const userAuth = require('../middleware/userAuth')


router.post('/apply', userAuth, visaController.applyVisa)
router.get('/applications', userAuth, visaController.getVisaApplications)
router.get('/user-applications', userAuth, visaController.getUserVisaApplications)
router.get('/applications/:id', userAuth, visaController.getVisaApplicationById)
router.put('/applications/:id/status', userAuth, visaController.updateVisaApplicationStatus)
router.put('/applications/:id/documents', userAuth, visaController.updateVisaApplicationWithDocs)
router.put('/applications/:id/suggest-appointments', userAuth, visaController.suggestAppointmentSchedules)
router.put('/applications/:id/choose-appointment', userAuth, visaController.chosenSuggestedSchedule)
router.put('/applications/:id/release-option', userAuth, visaController.passportReleaseOptionUpdate)
router.put('/applications/:id/resubmit-documents', userAuth, visaController.requestVisaDocumentResubmission)
router.post('/verify-payment', userAuth, visaController.verifyTokenCheckout);

module.exports = router
