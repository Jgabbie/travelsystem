const express = require('express');
const router = express.Router();
const contactController = require('../controllers/sendEmailController');

// Route to handle contact form submission
router.post('/contact', contactController.sendContactEmail);

module.exports = router;