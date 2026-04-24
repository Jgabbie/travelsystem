const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');
const userAuth = require('../middleware/userAuth');

const adminAuth = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
};

router.post('/add-package', userAuth, packageController.addPackage);
router.get('/popular-packages', packageController.getPopularPackages);
router.get('/get-packages', packageController.getPackages);
router.get('/archived-packages', userAuth, packageController.getArchivedPackages);
router.post('/archived-packages/:packageCode/restore', userAuth, packageController.restoreArchivedPackage);
router.get('/get-packages-for-users', packageController.getPackagesForUsers);
router.delete('/remove-package/:packageCode', userAuth, packageController.removePackage);
router.get('/get-package/:packageCode', packageController.getPackage);
router.put('/update-package/:packageCode', userAuth, packageController.updatePackage);
router.put('/update-slots', userAuth, packageController.updateSlots);
router.put('/update-discount', userAuth, packageController.updateDiscount);

module.exports = router;