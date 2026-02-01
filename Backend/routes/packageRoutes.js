const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');
const userAuth = require('../middleware/userAuth');

router.post('/add-package', userAuth, packageController.addPackage);
router.get('/get-packages', packageController.getPackages);
router.delete('/remove-package/:id', userAuth, packageController.removePackage);

module.exports = router;