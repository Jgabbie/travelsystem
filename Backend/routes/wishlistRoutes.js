import express from 'express';
import * as wishlistController from '../controllers/wishlistController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

// All wishlist routes require an authenticated user
router.post(
    '/add',
    userAuth,
    wishlistController.addToWishlist
);

router.get(
    '/',
    userAuth,
    wishlistController.getWishlist
);

router.delete(
    '/remove',
    userAuth,
    wishlistController.removeFromWishlist
);

router.delete(
    '/remove/:id',
    userAuth,
    wishlistController.removeWishlistItem
);

export default router;