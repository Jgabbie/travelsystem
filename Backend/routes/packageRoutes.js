const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');
const userAuth = require('../middleware/userAuth');

router.post('/add-package', userAuth, packageController.addPackage);
router.get('/popular-packages', packageController.getPopularPackages);
router.get('/get-packages', packageController.getPackages);
router.delete('/remove-package/:id', userAuth, packageController.removePackage);
router.get('/get-package/:id', packageController.getPackage);
router.put('/update-package/:id', userAuth, packageController.updatePackage);
router.put('/update-slots', userAuth, packageController.updateSlots);
router.put('/update-discount', userAuth, packageController.updateDiscount);

module.exports = router;