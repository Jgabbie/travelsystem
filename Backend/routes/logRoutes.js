const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const userAuth = require('../middleware/userAuth');

router.get('/get-logs', userAuth, logController.getLogs);

module.exports = router;