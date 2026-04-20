const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const userAuth = require('../middleware/userAuth');
const UserModel = require('../models/user');

const authorizeRoles = (allowedRoles) => async (req, res, next) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: "Unauthorized: User ID missing" });
        }

        const user = await UserModel.findById(req.userId);
        if (!user || !allowedRoles.includes(user.role)) {
            return res.status(403).json({ message: "Forbidden: Insufficient role" });
        }

        return next();
    } catch (err) {
        console.error("Role authorization failed:", err);
        return res.status(500).json({ message: "Role authorization failed" });
    }
};

router.get('/data', userAuth, userController.getUserData);
router.put('/data', userAuth, userController.updateUserData);
router.post('/login-once', userAuth, userController.markLoginOnce);
router.post('/createUsers', userAuth, authorizeRoles(['Admin', 'Employee']), userController.createUsers);
router.get('/getUsers', userController.getUsers);
router.get('/getArchivedUsers', userAuth, authorizeRoles(['Admin', 'Employee']), userController.getArchivedUsers);
router.post('/archived-users/:id/restore', userAuth, authorizeRoles(['Admin', 'Employee']), userController.restoreArchivedUser);
router.delete('/deleteUsers/:id', userAuth, authorizeRoles(['Admin', 'Employee']), userController.delUsers);

module.exports = router;