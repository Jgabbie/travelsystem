const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');
const userAuth = require('../middleware/userAuth');

router.post('/add-package', userAuth, packageController.addPackage);
router.get('/get-packages', packageController.getPackages);
router.delete('/remove-package/:id', userAuth, packageController.removePackage);
router.get('/get-package/:id', packageController.getPackage);
router.put('/update-package/:id', userAuth, packageController.updatePackage);

module.exports = router;