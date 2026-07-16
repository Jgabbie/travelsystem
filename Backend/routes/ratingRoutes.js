import express from 'express';
import * as ratingController from '../controllers/ratingController.js';
import userAuth from '../middleware/userAuth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';
import userAuthOptional from '../middleware/userAuthOptional.js'


const router = express.Router();

const staffOnly = authorizeRoles('Admin', 'Employee');

router.get(
    '/package/:packageItem/ratings',
    ratingController.getPackageRatings
);

router.get(
    '/average-rating/:id',
    ratingController.getAverageRating
);

router.get(
    '/average-ratings',
    ratingController.getAverageRatings
);


router.post(
    '/submit-rating',
    userAuth,
    ratingController.submitRating
);

router.get(
    '/my-ratings',
    userAuth,
    ratingController.getUserRatings
);

router.put(
    '/:id',
    userAuth,
    ratingController.updateRating
);

router.delete(
    '/:id',
    userAuth,
    ratingController.deleteRating
);


router.get(
    '/all-ratings',
    userAuth,
    staffOnly,
    ratingController.getAllRatings
);

router.get(
    '/archived-ratings',
    userAuth,
    staffOnly,
    ratingController.getArchivedRatings
);

router.post(
    '/archived-ratings/:id/restore',
    userAuth,
    staffOnly,
    ratingController.restoreArchivedRating
);

router.delete(
    '/delete/:id',
    userAuth,
    staffOnly,
    ratingController.adminDeleteRating
);

export default router;