const express = require('express')
const router = express.Router()
const bookingController = require('../controllers/bookingController')
const userAuth = require('../middleware/userAuth')
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

router.post('/create-booking', userAuth, bookingController.createBooking)
router.get('/my-bookings', userAuth, bookingController.getUserBookings)
router.get('/all-bookings', userAuth, adminOnly, bookingController.getAllBookings)
router.put('/:id', userAuth, adminOnly, bookingController.updateBooking)
router.delete('/:id', userAuth, adminOnly, bookingController.deleteBooking)
router.post('/cancel/:id', userAuth, bookingController.cancelBooking)
router.get('/cancellations', userAuth, adminOnly, bookingController.getcancellations)
module.exports = router