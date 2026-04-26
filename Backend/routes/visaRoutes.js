const express = require('express')
const router = express.Router()
const visaController = require('../controllers/visaController')
const userAuth = require('../middleware/userAuth')


router.post('/apply', userAuth, visaController.applyVisa)
router.get('/applications', userAuth, visaController.getVisaApplications)
router.get('/archived-applications', userAuth, visaController.getArchivedVisaApplications)
router.post('/archived-applications/:id/restore', userAuth, visaController.restoreArchivedVisaApplication)
router.get('/user-applications', userAuth, visaController.getUserVisaApplications)
router.get('/applications/:id', userAuth, visaController.getVisaApplicationById)
router.delete('/applications/:id/archive', userAuth, visaController.archiveVisaApplication)
router.put('/applications/:id/status', userAuth, visaController.updateVisaApplicationStatus)
router.put('/applications/:id/documents', userAuth, visaController.updateVisaApplicationWithDocs)
router.put('/applications/:id/suggest-appointments', userAuth, visaController.suggestAppointmentSchedules)
router.put('/applications/:id/choose-appointment', userAuth, visaController.chosenSuggestedSchedule)
router.put('/applications/:id/release-option', userAuth, visaController.passportReleaseOptionUpdate)
router.put('/applications/:id/delivery-details', userAuth, visaController.updateVisaDeliveryDetails)
router.put('/applications/:id/resubmit-documents', userAuth, visaController.requestVisaDocumentResubmission)
router.post('/verify-payment', userAuth, visaController.verifyTokenCheckout);

module.exports = router
