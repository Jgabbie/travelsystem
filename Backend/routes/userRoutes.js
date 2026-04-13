const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const userAuth = require('../middleware/userAuth');

router.get('/data', userAuth, userController.getUserData);
router.put('/data', userAuth, userController.updateUserData);
router.post('/login-once', userAuth, userController.markLoginOnce);
router.post('/createUsers', userAuth, userController.createUsers);
router.get('/getUsers', userController.getUsers);
router.delete('/deleteUsers/:id', userController.delUsers);

module.exports = router;