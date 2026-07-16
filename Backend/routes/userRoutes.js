import express from 'express';
import * as userController from '../controllers/userController.js';
import userAuth from '../middleware/userAuth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';


const router = express.Router();

const staffOnly = authorizeRoles('Admin', 'Employee');
const adminOnly = authorizeRoles('Admin');


router.get(
    '/data',
    userAuth,
    userController.getUserData
);

router.put(
    '/data',
    userAuth,
    userController.updateUserData
);

router.post(
    '/login-once',
    userAuth,
    userController.markLoginOnce
);


// Admin and Employee can view users
router.get(
    '/getUsers',
    userAuth,
    staffOnly,
    userController.getUsers
);

router.get(
    '/getArchivedUsers',
    userAuth,
    staffOnly,
    userController.getArchivedUsers
);

// Only Admin can create, archive, or restore accounts
router.post(
    '/createUsers',
    userAuth,
    adminOnly,
    userController.createUsers
);

router.post(
    '/archived-users/:id/restore',
    userAuth,
    adminOnly,
    userController.restoreArchivedUser
);

router.delete(
    '/deleteUsers/:id',
    userAuth,
    adminOnly,
    userController.delUsers
);


export default router;