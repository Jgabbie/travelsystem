const express = require('express');
const router = express.Router();
const preferrencesController = require('../controllers/preferrencesController');
const userAuth = require('../middleware/userAuth');

router.post('/save', userAuth, preferrencesController.savePreferrences);
router.get('/me', userAuth, preferrencesController.getMyPreferrences);

module.exports = router;
