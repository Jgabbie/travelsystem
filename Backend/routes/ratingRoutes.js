import express from 'express';
import * as ratingController from '../controllers/ratingController.js';
import userAuth from '../middleware/userAuth.js';
import userAuthOptional from '../middleware/userAuthOptional.js'
import UserModel from '../models/user.js'

const router = express.Router();

const adminOnly = async (req, res, next) => {
    try {
        const user = await UserModel.findById(req.userId).lean()
        if (!user || (user.role !== 'Admin' && user.role !== 'Employee')) {
            return res.status(403).json({ message: 'Forbidden: Admins and Employees only' })
        }
        next()
    } catch (err) {
        res.status(500).json({ message: 'Authorization check failed: ' + err.message })
    }
}

router.post('/submit-rating', userAuthOptional, ratingController.submitRating)
router.get('/package/:packageItem/ratings', ratingController.getPackageRatings)
router.get('/my-ratings', userAuth, ratingController.getUserRatings)
router.delete('/:id', userAuth, ratingController.deleteRating)
router.get('/all-ratings', userAuth, adminOnly, ratingController.getAllRatings)
router.get('/archived-ratings', userAuth, adminOnly, ratingController.getArchivedRatings)
router.post('/archived-ratings/:id/restore', userAuth, adminOnly, ratingController.restoreArchivedRating)
router.delete('/delete/:id', userAuth, adminOnly, ratingController.adminDeleteRating)
router.put('/:id', userAuth, ratingController.updateRating)
router.get('/average-rating/:id', ratingController.getAverageRating)
router.get('/average-ratings', ratingController.getAverageRatings)

export default router;