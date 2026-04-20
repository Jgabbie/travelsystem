const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const userAuth = require('../middleware/userAuth');

router.post('/create-service', userAuth, serviceController.createService);
router.get('/services', serviceController.getAllServices);
router.get('/archived-services', userAuth, serviceController.getArchivedServices);
router.post('/archived-services/:id/restore', userAuth, serviceController.restoreArchivedService);
router.put('/update-service/:id', userAuth, serviceController.updateService);
router.delete('/delete-service/:id', userAuth, serviceController.deleteService);
router.get('/get-service/:id', userAuth, serviceController.getService);

module.exports = router