import express from 'express';
import * as serviceController from '../controllers/serviceController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

router.post('/create-service', userAuth, serviceController.createService);
router.get('/services', serviceController.getAllServices);
router.get('/archived-services', userAuth, serviceController.getArchivedServices);
router.post('/archived-services/:id/restore', userAuth, serviceController.restoreArchivedService);
router.put('/update-service/:id', userAuth, serviceController.updateService);
router.delete('/delete-service/:id', userAuth, serviceController.deleteService);
router.get('/get-service/:id', userAuth, serviceController.getService);

export default router;