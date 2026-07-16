import express from 'express';
import * as serviceController from '../controllers/serviceController.js';
import userAuth from '../middleware/userAuth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

const staffOnly = authorizeRoles('Admin', 'Employee');

router.get(
    '/services',
    serviceController.getAllServices
);

router.get(
    '/get-service/:id',
    serviceController.getService
);

router.post(
    '/create-service',
    userAuth,
    staffOnly,
    serviceController.createService
);

router.get(
    '/archived-services',
    userAuth,
    staffOnly,
    serviceController.getArchivedServices
);

router.post(
    '/archived-services/:id/restore',
    userAuth,
    staffOnly,
    serviceController.restoreArchivedService
);

router.put(
    '/update-service/:id',
    userAuth,
    staffOnly,
    serviceController.updateService
);

router.delete(
    '/delete-service/:id',
    userAuth,
    staffOnly,
    serviceController.deleteService
);

export default router;