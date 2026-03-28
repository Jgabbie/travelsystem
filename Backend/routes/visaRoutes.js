const express = require('express')
const router = express.Router()
const visaController = require('../controllers/visaController')
const userAuth = require('../middleware/userAuth')


router.post('/apply', userAuth, visaController.applyVisa)
router.get('/applications', userAuth, visaController.getVisaApplications)
router.get('/applications/:id', userAuth, visaController.getVisaApplicationById)
router.put('/applications/:id/status', userAuth, visaController.updateVisaApplicationStatus)
router.put('/applications/:id/documents', userAuth, visaController.updateVisaApplicationWithDocs)

module.exports = router
