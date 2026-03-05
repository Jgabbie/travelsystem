const express = require('express');
const router = express.Router();
const passportController = require('../controllers/passportController');
const userAuth = require('../middleware/userAuth');

router.post('/apply', userAuth, passportController.applyPassport);
router.get('/applications', userAuth, passportController.getPassportApplications);

module.exports = router;