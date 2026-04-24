const express = require('express')
const router = express.Router()
const ratingController = require('../controllers/ratingController')
const userAuth = require('../middleware/userAuth')
const userAuthOptional = require('../middleware/userAuthOptional')
const UserModel = require('../models/user')

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
router.get('/package/:packageCode/ratings', ratingController.getPackageRatings)
router.get('/my-ratings', userAuth, ratingController.getUserRatings)
router.delete('/:id', userAuth, ratingController.deleteRating)
router.get('/all-ratings', userAuth, adminOnly, ratingController.getAllRatings)
router.get('/archived-ratings', userAuth, adminOnly, ratingController.getArchivedRatings)
router.post('/archived-ratings/:id/restore', userAuth, adminOnly, ratingController.restoreArchivedRating)
router.delete('/delete/:id', userAuth, adminOnly, ratingController.adminDeleteRating)
router.put('/:id', userAuth, ratingController.updateRating)
router.get('/average-rating/:packageCode', ratingController.getAverageRating)
router.get('/average-ratings', ratingController.getAverageRatings)

module.exports = router