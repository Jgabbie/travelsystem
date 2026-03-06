const express = require('express')
const router = express.Router()
const visaController = require('../controllers/visaController')
const userAuth = require('../middleware/userAuth')

router.post('/apply', userAuth, visaController.applyVisa)
router.get('/applications', userAuth, visaController.getVisaApplications)

module.exports = router
