const express = require('express')
const router = express.Router()
const ratingController = require('../controllers/ratingController')
const userAuth = require('../middleware/userAuth')
const optionalUserAuth = require('../middleware/optionalUserAuth')
const UserModel = require('../models/user')

const adminOnly = async (req, res, next) => {
    try {
        const user = await UserModel.findById(req.userId).lean()
        if (!user || user.role !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden: Admins only' })
        }
        next()
    } catch (err) {
        res.status(500).json({ message: 'Authorization check failed: ' + err.message })
    }
}

router.post('/submit-rating', optionalUserAuth, ratingController.submitRating)
router.get('/package/:packageId/ratings', ratingController.getPackageRatings)
router.get('/my-ratings', userAuth, ratingController.getUserRatings)
router.delete('/:id', userAuth, ratingController.deleteRating)
router.get('/all-ratings', userAuth, adminOnly, ratingController.getAllRatings)

module.exports = router