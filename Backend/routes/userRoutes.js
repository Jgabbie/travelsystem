const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/getUsers', userController.getUsers);
router.post('/createUsers', userController.createUsers);
router.delete('/deleteUsers', userController.delUsers)

module.exports = router;