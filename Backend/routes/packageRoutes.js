import express from 'express';
import * as packageController from '../controllers/packageController.js';
import userAuth from '../middleware/userAuth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

const staffOnly = authorizeRoles('Admin', 'Employee');

router.get(
    '/popular-packages',
    packageController.getPopularPackages
);

router.get(
    '/get-packages-for-users',
    packageController.getPackagesForUsers
);

router.get(
    '/get-package/:id',
    packageController.getPackage
);

router.post(
    '/add-package',
    userAuth,
    staffOnly,
    packageController.addPackage
);

router.get(
    '/get-packages',
    userAuth,
    staffOnly,
    packageController.getPackages
);

router.get(
    '/archived-packages',
    userAuth,
    staffOnly,
    packageController.getArchivedPackages
);

router.post(
    '/archived-packages/:id/restore',
    userAuth,
    staffOnly,
    packageController.restoreArchivedPackage
);

router.delete(
    '/remove-package/:id',
    userAuth,
    staffOnly,
    packageController.removePackage
);

router.put(
    '/update-package/:id',
    userAuth,
    staffOnly,
    packageController.updatePackage
);

router.put(
    '/update-slots',
    userAuth,
    staffOnly,
    packageController.updateSlots
);

router.put(
    '/update-discount',
    userAuth,
    staffOnly,
    packageController.updateDiscount
);

export default router;