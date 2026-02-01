const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');

router.post('/add-package', packageController.addPackage);
router.get('/get-packages', packageController.getPackages);
router.delete('/remove-package/:id', packageController.removePackage);

module.exports = router;