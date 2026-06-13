import express from 'express';
const router = express.Router();
import * as wishlistController from '../controllers/wishlistController.js';
import userAuth from '../middleware/userAuth.js';

router.post('/add', userAuth, wishlistController.addToWishlist);
router.get('/', userAuth, wishlistController.getWishlist);
router.delete('/remove', userAuth, wishlistController.removeFromWishlist);
router.delete('/remove/:id', userAuth, wishlistController.removeWishlistItem);

export default router;