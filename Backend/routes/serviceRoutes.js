const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const userAuth = require('../middleware/userAuth');

router.post('/create-service', userAuth, serviceController.createService);
router.get('/services', userAuth, serviceController.getAllServices);
router.put('/update-service/:id', userAuth, serviceController.updateService);
router.delete('/delete-service/:id', userAuth, serviceController.deleteService);
router.get('/get-service/:id', userAuth, serviceController.getService);

module.exports = router