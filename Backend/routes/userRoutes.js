const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const userAuth = require('../middleware/userAuth');

router.get('/data', userAuth, userController.getUserData);
router.put('/data', userAuth, userController.updateUserData);
router.get('/getUsers', userController.getUsers);

router.post('/createUsers', userAuth, userController.createUsers); 

router.delete('/deleteUsers', userController.delUsers);

module.exports = router;