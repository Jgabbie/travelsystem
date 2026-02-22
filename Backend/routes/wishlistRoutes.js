const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const userAuth = require('../middleware/userAuth');

router.post('/add', userAuth, wishlistController.addToWishlist);
router.get('/', userAuth, wishlistController.getWishlist);
router.delete('/remove', userAuth, wishlistController.removeFromWishlist);

module.exports = router;